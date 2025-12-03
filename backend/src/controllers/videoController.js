import Video from "../models/Video.js";
import { processVideo } from "../services/videoProcessor.js";
import cloudinary from "../config/cloudinary.js";

/**
 * Upload a new video
 * POST /api/videos/upload
 */
export const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No video file uploaded" });
    }

    const { title, description } = req.body;

    if (!title) {
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
      status: "pending",
    });

    await video.save();

    // Start processing asynchronously
    const io = req.app.get("io");
    // Don't await - process in background
    processVideo(video._id.toString(), io).catch((err) => {
      console.error("Background processing error:", err);
    });

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
    console.error("Upload error:", error);

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
    const {
      status,
      sensitivityStatus,
      search,
      sortBy = "createdAt",
      order = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    // Build query
    const query = {};

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
    console.error("Get videos error:", error);
    res.status(500).json({ message: "Error fetching videos" });
  }
};

/**
 * Get a single video by ID
 * GET /api/videos/:id
 */
export const getVideo = async (req, res) => {
  try {
    // Video is already attached by middleware
    const video = req.video;

    // Populate user info
    await video.populate("uploadedBy", "name email");

    // Don't expose file path
    const videoData = video.toObject();
    delete videoData.filepath;

    res.json({ video: videoData });
  } catch (error) {
    console.error("Get video error:", error);
    res.status(500).json({ message: "Error fetching video" });
  }
};

/**
 * Stream video (Redirect to Cloudinary)
 * GET /api/videos/:id/stream
 */
export const streamVideo = async (req, res) => {
  try {
    const video = req.video;
    // Redirect to Cloudinary URL
    // Cloudinary handles range requests and streaming automatically
    res.redirect(video.filepath);
  } catch (error) {
    console.error("Stream video error:", error);
    res.status(500).json({ message: "Error streaming video" });
  }
};

/**
 * Update video metadata
 * PUT /api/videos/:id
 */
export const updateVideo = async (req, res) => {
  try {
    const video = req.video;
    const { title, description } = req.body;

    if (title) video.title = title;
    if (description !== undefined) video.description = description;

    await video.save();

    res.json({
      message: "Video updated successfully",
      video: {
        id: video._id,
        title: video.title,
        description: video.description,
      },
    });
  } catch (error) {
    console.error("Update video error:", error);
    res.status(500).json({ message: "Error updating video" });
  }
};

/**
 * Delete a video
 * DELETE /api/videos/:id
 */
export const deleteVideo = async (req, res) => {
  try {
    const video = req.video;

    // Delete from Cloudinary
    if (video.storedFilename) {
      await cloudinary.uploader.destroy(video.storedFilename, { resource_type: "video" });
    }

    // Delete from database
    await Video.findByIdAndDelete(video._id);

    res.json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Delete video error:", error);
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

    // Build query (no user filter for admin)
    const query = {};

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
