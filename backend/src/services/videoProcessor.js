import ffmpeg from "fluent-ffmpeg";
import { analyzeSensitivity } from "./sensitivityAnalyzer.js";
import Video from "../models/Video.js";

/**
 * Extract video metadata using FFmpeg
 * @param {string} filepath - Path to video file
 * @returns {Promise<object>} Video metadata
 */
export const extractVideoMetadata = (filepath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metadata) => {
      if (err) {
        console.error("FFprobe error:", err);
        return reject(err);
      }

      try {
        const videoStream = metadata.streams.find(
          (stream) => stream.codec_type === "video"
        );

        if (!videoStream) {
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

        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
};

/**
 * Update processing progress and emit Socket.io event
 * @param {string} videoId - Video ID
 * @param {number} progress - Progress percentage (0-100)
 * @param {object} io - Socket.io instance
 * @param {string} userId - User ID for targeted emission
 */
const updateProgress = async (videoId, progress, io, userId) => {
  try {
    await Video.findByIdAndUpdate(videoId, {
      processingProgress: progress,
    });

    // Emit to user-specific room
    if (io) {
      io.to(`user:${userId}`).emit("video:processing:progress", {
        videoId,
        progress,
      });
    }
  } catch (error) {
    console.error("Error updating progress:", error);
  }
};

/**
 * Main video processing pipeline
 * @param {string} videoId - Video ID
 * @param {object} io - Socket.io instance (optional)
 */
export const processVideo = async (videoId, io = null) => {
  let video;

  try {
    // Fetch video record
    video = await Video.findById(videoId);
    if (!video) {
      throw new Error("Video not found");
    }

    const userId = video.uploadedBy.toString();

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
    await updateProgress(videoId, 10, io, userId);
    const metadata = await extractVideoMetadata(video.filepath);

    // Update video with metadata
    video.duration = metadata.duration;
    video.resolution = metadata.resolution;
    video.codec = metadata.codec;
    await video.save();

    await updateProgress(videoId, 25, io, userId);

    // Step 2: Simulate processing delay (50% progress)
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await updateProgress(videoId, 50, io, userId);

    // Step 3: Run sensitivity analysis (75% progress)
    await updateProgress(videoId, 60, io, userId);
    const sensitivityResult = await analyzeSensitivity(
      video.filepath,
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
      });
    }

    console.log(`Video ${videoId} processed successfully`);
  } catch (error) {
    console.error(`Error processing video ${videoId}:`, error);

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
