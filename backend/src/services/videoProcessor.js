import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { analyzeSensitivity } from "./sensitivityAnalyzer.js";
import Video from "../models/Video.js";
import cloudinary from "../config/cloudinary.js";


/**
 * Extract video metadata using Cloudinary API or FFmpeg
 * @param {string} filepath - Path to video file
 * @param {string} publicId - Cloudinary public ID (optional)
 * @returns {Promise<object>} Video metadata
 */
export const extractVideoMetadata = (filepath, publicId = null) => {
  console.log('[VideoProcessor.extractVideoMetadata] Entry:', { filepath, publicId });

  // If we have a Cloudinary public ID, fetch metadata from Cloudinary API
  // This avoids running ffprobe on large remote files which causes OOM
  if (publicId) {
    return new Promise((resolve, reject) => {
      cloudinary.api.resource(publicId, { resource_type: "video" })
        .then((result) => {
          console.log('[VideoProcessor.extractVideoMetadata] Cloudinary metadata fetched');
          resolve({
            duration: result.duration || 0,
            resolution: {
              width: result.width || 0,
              height: result.height || 0,
            },
            codec: result.format || "unknown",
            bitrate: result.bit_rate || 0,
            format: result.format || "unknown",
          });
        })
        .catch((err) => {
          console.error("[VideoProcessor.extractVideoMetadata] Cloudinary API error:", err);
          // Fallback to ffprobe if Cloudinary API fails
          reject(err);
        });
    });
  }

  // Fallback to FFprobe for local files
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metadata) => {
      if (err) {
        console.error("[VideoProcessor.extractVideoMetadata] FFprobe error:", err);
        return reject(err);
      }

      try {
        const videoStream = metadata.streams.find(
          (stream) => stream.codec_type === "video"
        );

        if (!videoStream) {
          console.error('[VideoProcessor.extractVideoMetadata] No video stream found');
          return reject(new Error("No video stream found"));
        }

        const result = {
          duration: metadata.format.duration || 0,
          resolution: {
            width: videoStream.width || 0,
            height: videoStream.height || 0,
          },
          codec: videoStream.codec_name || "unknown",
          bitrate: metadata.format.bit_rate || 0,
          format: metadata.format.format_name || "unknown",
        };

        console.log('[VideoProcessor.extractVideoMetadata] Success:', result);
        resolve(result);
      } catch (error) {
        console.error('[VideoProcessor.extractVideoMetadata] Error:', error);
        reject(error);
      }
    });
  });
};

/**
 * Generate video thumbnail using FFmpeg
 * @param {string} videoPath - Absolute path to video file
 * @param {string} videoId - Video ID for unique naming
 * @param {number} duration - Video duration in seconds
 * @returns {Promise<string>} Path to generated thumbnail
 */
const generateThumbnail = (videoPath, videoId, duration) => {
  return new Promise((resolve, reject) => {
    // Determine timestamp to capture (10% into video, min 1 second)
    const timestamp = Math.max(1, Math.floor(duration * 0.1));
    
    // Create thumbnail filename
    const thumbnailFilename = `${videoId}-thumb.jpg`;
    const thumbnailsDir = path.join(process.cwd(), "uploads", "thumbnails");
    
    // Ensure thumbnails directory exists
    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    }
    
    const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);
    
    console.log('[VideoProcessor.generateThumbnail] Generating:', { videoPath, thumbnailPath, timestamp });
    
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timestamp],
        filename: thumbnailFilename,
        folder: thumbnailsDir,
        size: '480x?'
      })
      .on('end', () => {
        console.log('[VideoProcessor.generateThumbnail] Success:', thumbnailPath);
        resolve(thumbnailPath);
      })
      .on('error', (err) => {
        console.error('[VideoProcessor.generateThumbnail] Error:', err);
        reject(err);
      });
  });
};

/**
 * Update processing progress and emit Socket.io event
 * @param {string} videoId - Video ID
 * @param {number} progress - Progress percentage (0-100)
 * @param {object} io - Socket.io instance
 * @param {string} userId - User ID for targeted emission
 * @param {object} extraData - Additional data to emit (e.g. thumbnail, duration)
 */
const updateProgress = async (videoId, progress, io, userId, extraData = {}) => {
  try {
    console.log('[VideoProcessor.updateProgress]', { videoId, progress, userId, ...extraData });
    await Video.findByIdAndUpdate(videoId, {
      processingProgress: progress,
    });

    // Emit to user-specific room
    if (io) {
      io.to(`user:${userId}`).emit("video:processing:progress", {
        videoId,
        progress,
        ...extraData
      });
    }
  } catch (error) {
    console.error("[VideoProcessor.updateProgress] Error:", error);
  }
};

/**
 * Main video processing pipeline
 * @param {string} videoId - Video ID
 * @param {object} io - Socket.io instance (optional)
 */
export const processVideo = async (videoId, io = null) => {
  console.log('[VideoProcessor.processVideo] Entry:', { videoId });
  let video;

  try {
    // Fetch video record
    video = await Video.findById(videoId);
    if (!video) {
      console.error('[VideoProcessor.processVideo] Video not found:', videoId);
      throw new Error("Video not found");
    }

    const userId = video.uploadedBy.toString();
    console.log('[VideoProcessor.processVideo] Starting processing for user:', userId, 'Filepath:', video.filepath);

    // Determine if file is local or remote (Cloudinary)
    const isLocalFile = !video.filepath.startsWith("http");
    // For local files, strict path is usually resolved relative to project root or absolute
    // For Cloudinary, we don't download, so 'actualFilePath' is mainly for local logic
    const actualFilePath = isLocalFile ? path.resolve(video.filepath) : video.filepath;

    // Update status to processing
    video.status = "processing";
    video.processingProgress = 0;
    await video.save();

    // Emit processing start event
    if (io) {
      io.to(`user:${userId}`).emit("video:processing:start", {
        videoId,
      });
    }

    // Step 1: Extract metadata (25% progress)
    console.log('[VideoProcessor.processVideo] Step 1: Extracting metadata');
    await updateProgress(videoId, 10, io, userId);
    
    // OOM FIX: Pass storedFilename (public_id) so we use Cloudinary API instead of ffprobe
    const metadata = await extractVideoMetadata(video.filepath, video.storedFilename);

    // Update video with metadata
    video.duration = metadata.duration;
    video.resolution = metadata.resolution;
    video.codec = metadata.codec;
    await video.save();

    // Emit progress update WITH metadata (duration, etc.)
    await updateProgress(videoId, 25, io, userId, { 
      duration: video.duration,
      resolution: video.resolution 
    });

    // Step 1.5: Generate thumbnail (35% progress)
    console.log('[VideoProcessor.processVideo] Step 1.5: Handling thumbnail');
    
    try {
      if (isLocalFile) {
        // LOCAL MODE: Generate thumbnail locally using FFmpeg
        const thumbnailPath = await generateThumbnail(actualFilePath, videoId, metadata.duration);
        const thumbnailFilename = path.basename(thumbnailPath);
        video.thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;
        console.log('[VideoProcessor.processVideo] Local thumbnail generated:', video.thumbnailUrl);
      } else {
        // CLOUDINARY MODE: Use Cloudinary's auto-generated thumbnail
        // IMPORTANT: For video thumbnails, we keep the resource_type as 'video'
        // but change the file extension to .jpg. This tells Cloudinary to take a frame from the video.
        // We do NOT change /video/ to /image/ because the asset is stored as a video resource.
        
        // Ensure extension is .jpg (remove current extension and add .jpg)
        video.thumbnailUrl = video.filepath.replace(/\.[^/.]+$/, ".jpg");
        console.log('[VideoProcessor.processVideo] Using Cloudinary thumbnail:', video.thumbnailUrl);
      }
      
      await video.save();
      
      // Emit progress update WITH thumbnail URL
      await updateProgress(videoId, 35, io, userId, { 
        thumbnailUrl: video.thumbnailUrl 
      });
    } catch (thumbnailError) {
      console.error('[VideoProcessor.processVideo] Thumbnail handling failed:', thumbnailError);
      // Continue processing even if thumbnail fails
    }
    
    if (!video.thumbnailUrl) {
        await updateProgress(videoId, 35, io, userId);
    }

    // Step 2: Simulate processing delay (50% progress)
    console.log('[VideoProcessor.processVideo] Step 2: Processing video');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await updateProgress(videoId, 50, io, userId);

    // Step 3: Run sensitivity analysis (75% progress)
    console.log('[VideoProcessor.processVideo] Step 3: Running sensitivity analysis');
    await updateProgress(videoId, 60, io, userId);
    const sensitivityResult = await analyzeSensitivity(
      actualFilePath,
      metadata,
      video.filename
    );

    // Update video with sensitivity results
    video.sensitivityStatus = sensitivityResult.status;
    video.sensitivityScore = sensitivityResult.score;
    video.flaggedReasons = sensitivityResult.reasons;
    await video.save();

    await updateProgress(videoId, 75, io, userId);

    // Step 4: Finalize (100% progress)
    console.log('[VideoProcessor.processVideo] Step 4: Finalizing');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    video.status = "completed";
    video.processingProgress = 100;
    await video.save();

    // Emit completion event
    if (io) {
      io.to(`user:${userId}`).emit("video:processing:complete", {
        videoId,
        status: video.status,
        sensitivityStatus: video.sensitivityStatus,
        sensitivityScore: video.sensitivityScore,
        flaggedReasons: video.flaggedReasons,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
        resolution: video.resolution
      });
    }

    console.log(`[VideoProcessor.processVideo] Success: Video ${videoId} processed successfully`);
  } catch (error) {
    console.error(`[VideoProcessor.processVideo] Error processing video ${videoId}:`, error);

    // Update video status to failed
    if (video) {
      video.status = "failed";
      video.processingProgress = 0;
      await video.save();

      // Emit error event
      if (io) {
        const userId = video.uploadedBy.toString();
        io.to(`user:${userId}`).emit("video:processing:error", {
          videoId,
          error: error.message,
        });
      }
    }
  }
};
