import Video from "../models/Video.js";
import { processVideo } from "../services/videoProcessor.js";
import cloudinary from "../config/cloudinary.js";

/**
 * Upload a new video
 * POST /api/videos/upload
 */
export const uploadVideo = async (req, res) => {
  try {
    console.log('[VideoController.uploadVideo] Entry:', { userId: req.user.id, filename: req.file?.originalname });
    
    if (!req.file) {
      console.log('[VideoController.uploadVideo] No file uploaded');
      return res.status(400).json({ message: "No video file uploaded" });
    }

    const { title, description } = req.body;

    if (!title) {
      console.log('[VideoController.uploadVideo] Title missing, cleaning up file');
      // Clean up uploaded file (delete from Cloudinary)
      if (req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename, { resource_type: "video" });
      }
      return res.status(400).json({ message: "Title is required" });
    }

    // Create video record
    const video = new Video({
      title,
      description: description || "",
      filename: req.file.originalname,
      storedFilename: req.file.filename, // Cloudinary public_id
      filepath: req.file.path, // Cloudinary secure_url
      filesize: req.file.size,
      mimetype: req.file.mimetype,
      uploadedBy: req.user.id,
      organizationId: req.user.organizationId,
      status: "pending",
    });

    await video.save();
    console.log('[VideoController.uploadVideo] Video record created:', { videoId: video._id, title: video.title });

    // Start processing asynchronously
    const io = req.app.get("io");
    // Don't await - process in background
    processVideo(video._id.toString(), io).catch((err) => {
      console.error("[VideoController.uploadVideo] Background processing error:", err);
    });

    console.log('[VideoController.uploadVideo] Success: Video uploaded and processing started');
    res.status(201).json({
      message: "Video uploaded successfully",
      video: {
        id: video._id,
        title: video.title,
        description: video.description,
        filename: video.filename,
        filesize: video.filesize,
        status: video.status,
        createdAt: video.createdAt,
      },
    });
  } catch (error) {
    console.error("[VideoController.uploadVideo] Error:", error);

    // Clean up file if it was uploaded
    if (req.file && req.file.filename) {
      await cloudinary.uploader.destroy(req.file.filename, { resource_type: "video" });
    }

    res.status(500).json({ message: "Error uploading video" });
  }
};

/**
 * Get all videos for the current user (or all videos for admin)
 * GET /api/videos
 */
export const getVideos = async (req, res) => {
  try {
    console.log('[VideoController.getVideos] Entry:', { userId: req.user.id, role: req.user.role, query: req.query });
    
    const {
      status,
      sensitivityStatus,
      search,
      sortBy = "createdAt",
      order = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    // Build query - ALWAYS filter by organization
    const query = {
      organizationId: req.user.organizationId
    };

    // Non-admin users can only see their own videos
    if (req.user.role !== "admin") {
      query.uploadedBy = req.user.id;
    }

    // Apply filters
    if (status) {
      query.status = status;
    }

    if (sensitivityStatus) {
      query.sensitivityStatus = sensitivityStatus;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort
    const sortOrder = order === "asc" ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const videos = await Video.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("uploadedBy", "name email")
      .select("-filepath"); // Don't expose file path

    const total = await Video.countDocuments(query);
    console.log('[VideoController.getVideos] Success:', { count: videos.length, total, page });

    res.json({
      videos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("[VideoController.getVideos] Error:", error);
    res.status(500).json({ message: "Error fetching videos" });
  }
};

/**
 * Get a single video by ID
 * GET /api/videos/:id
 */
export const getVideo = async (req, res) => {
  try {
    console.log('[VideoController.getVideo] Entry:', { videoId: req.params.id, userId: req.user.id });
    // Video is already attached by middleware
    const video = req.video;

    // Populate user info
    await video.populate("uploadedBy", "name email");

    // Don't expose file path
    const videoData = video.toObject();
    delete videoData.filepath;

    console.log('[VideoController.getVideo] Success:', { videoId: video._id, title: video.title });
    res.json({ video: videoData });
  } catch (error) {
    console.error("[VideoController.getVideo] Error:", error);
    res.status(500).json({ message: "Error fetching video" });
  }
};

/**
 * Stream video (Redirect to Cloudinary)
 * GET /api/videos/:id/stream
 */
export const streamVideo = async (req, res) => {
  try {
    console.log('[VideoController.streamVideo] Entry:', { videoId: req.params.id, userId: req.user.id });
    const video = req.video;
    console.log('[VideoController.streamVideo] Redirecting to Cloudinary:', video.filepath);
    // Redirect to Cloudinary URL
    // Cloudinary handles range requests and streaming automatically
    res.redirect(video.filepath);
  } catch (error) {
    console.error("[VideoController.streamVideo] Error:", error);
    res.status(500).json({ message: "Error streaming video" });
  }
};

/**
 * Update video metadata
 * PUT /api/videos/:id
 */
export const updateVideo = async (req, res) => {
  try {
    console.log('[VideoController.updateVideo] Entry:', { videoId: req.params.id, updates: req.body });
    const video = req.video;
    const { title, description } = req.body;

    if (title) video.title = title;
    if (description !== undefined) video.description = description;

    await video.save();
    console.log('[VideoController.updateVideo] Success:', { videoId: video._id, title: video.title });

    res.json({
      message: "Video updated successfully",
      video: {
        id: video._id,
        title: video.title,
        description: video.description,
      },
    });
  } catch (error) {
    console.error("[VideoController.updateVideo] Error:", error);
    res.status(500).json({ message: "Error updating video" });
  }
};

/**
 * Delete a video
 * DELETE /api/videos/:id
 */
export const deleteVideo = async (req, res) => {
  try {
    console.log('[VideoController.deleteVideo] Entry:', { videoId: req.params.id, userId: req.user.id });
    const video = req.video;

    // Delete from Cloudinary
    if (video.storedFilename) {
      console.log('[VideoController.deleteVideo] Deleting from Cloudinary:', video.storedFilename);
      await cloudinary.uploader.destroy(video.storedFilename, { resource_type: "video" });
    }

    // Delete from database
    await Video.findByIdAndDelete(video._id);
    console.log('[VideoController.deleteVideo] Success: Video deleted');

    res.json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("[VideoController.deleteVideo] Error:", error);
    res.status(500).json({ message: "Error deleting video" });
  }
};

/**
 * Admin: Get all videos from all users
 * GET /api/videos/admin/all
 */
export const getAllVideosAdmin = async (req, res) => {
  try {
    const {
      status,
      sensitivityStatus,
      search,
      sortBy = "createdAt",
      order = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    // Build query - ALWAYS filter by organization (even for admin)
    const query = {
      organizationId: req.user.organizationId
    };

    if (status) {
      query.status = status;
    }

    if (sensitivityStatus) {
      query.sensitivityStatus = sensitivityStatus;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort
    const sortOrder = order === "asc" ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const videos = await Video.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("uploadedBy", "name email role")
      .select("-filepath");

    const total = await Video.countDocuments(query);

    res.json({
      videos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get all videos error:", error);
    res.status(500).json({ message: "Error fetching videos" });
  }
};
