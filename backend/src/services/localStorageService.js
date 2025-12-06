import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import Video from "../models/Video.js";
import { processVideo } from "./videoProcessor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory for storing videos locally
const VIDEOS_DIR = path.join(__dirname, "../../uploads/videos");

// Ensure the videos directory exists
if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

/**
 * Process the upload locally in development mode
 * @param {string} videoId - The ID of the video record
 * @param {string} filePath - Local path to the temporary file
 * @param {object} io - Socket.io instance for events
 */
export const processUpload = async (videoId, filePath, io) => {
  console.log('[LocalStorageService.processUpload] Entry:', { videoId, filePath });
  
  try {
    const video = await Video.findById(videoId);
    if (!video) {
      throw new Error("Video not found");
    }

    // Generate unique filename
    const fileExt = path.extname(filePath);
    const uniqueFilename = `${uuidv4()}${fileExt}`;
    const destinationPath = path.join(VIDEOS_DIR, uniqueFilename);

    console.log('[LocalStorageService] Moving file to local storage:', destinationPath);

    // Move file from temp location to videos directory
    fs.renameSync(filePath, destinationPath);

    // Get file stats
    const stats = fs.statSync(destinationPath);
    const fileSize = stats.size;

    console.log('[LocalStorageService] File stored locally:', { 
      uniqueFilename, 
      size: fileSize 
    });

    // Update video with local storage details
    // Store as a relative path that can be served by Express
    video.storedFilename = uniqueFilename;
    video.filepath = `/uploads/videos/${uniqueFilename}`;
    video.status = "processing";
    await video.save();

    // Trigger video processing (metadata, sensitivity, etc.)
    await processVideo(videoId, io);

  } catch (error) {
    console.error('[LocalStorageService] Upload error:', error);
    
    // Update status to failed
    await Video.findByIdAndUpdate(videoId, { 
      status: "failed",
      processingProgress: 0 
    });

    // Emit error event
    if (io) {
      try {
        const video = await Video.findById(videoId);
        if (video) {
          io.to(`user:${video.uploadedBy}`).emit("video:processing:error", {
            videoId,
            error: error.message || "Upload failed"
          });
        }
      } catch (emitError) {
        console.error('[LocalStorageService] Error emitting failure event:', emitError);
      }
    }

    // Try to clean up temp file even on error
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError) {
      console.error('[LocalStorageService] Error cleaning up temp file:', cleanupError);
    }
  }
};

/**
 * Get the absolute path for a locally stored video
 * @param {string} filename - The stored filename
 * @returns {string} Absolute path to the video file
 */
export const getVideoPath = (filename) => {
  return path.join(VIDEOS_DIR, filename);
};

/**
 * Delete a locally stored video file and its thumbnail
 * @param {string} filename - The stored filename
 * @param {string} videoId - The video ID (for thumbnail deletion)
 */
export const deleteVideo = (filename, videoId = null) => {
  try {
    // Delete video file if filename is provided
    if (filename) {
      const videoPath = path.join(VIDEOS_DIR, filename);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
        console.log('[LocalStorageService] Deleted video:', filename);
      }
    }
    
    // Delete thumbnail if videoId is provided
    if (videoId) {
      const thumbnailFilename = `${videoId}-thumb.jpg`;
      const thumbnailPath = path.join(__dirname, "../../uploads/thumbnails", thumbnailFilename);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
        console.log('[LocalStorageService] Deleted thumbnail:', thumbnailFilename);
      }
    }
  } catch (error) {
    console.error('[LocalStorageService] Error deleting video:', error);
    throw error;
  }
};
