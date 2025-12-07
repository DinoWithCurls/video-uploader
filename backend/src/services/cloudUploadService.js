import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import Video from "../models/Video.js";
import { processVideo } from "./videoProcessor.js";
import * as localStorageService from "./localStorageService.js";

/**
 * Process the upload to Cloudinary in the background
 * @param {string} videoId - The ID of the video record
 * @param {string} filePath - Local path to the temporary file
 * @param {object} io - Socket.io instance for events
 */
export const processUpload = async (videoId, filePath, io) => {
  console.log('[CloudUploadService.processUpload] Entry:', { videoId, filePath });
  
  // Check storage mode - use local storage in development
  const storageMode = process.env.STORAGE_MODE || 'cloudinary';
  
  if (storageMode === 'local') {
    console.log('[CloudUploadService] Using local storage mode');
    return await localStorageService.processUpload(videoId, filePath, io);
  }
  
  console.log('[CloudUploadService] Using Cloudinary storage mode');
  
  try {
    const video = await Video.findById(videoId);
    if (!video) {
        throw new Error("Video not found");
    }

    // Determine upload method based on file size
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // Thresholds
    const COMPRESSION_THRESHOLD = 200 * 1024 * 1024; // 200MB
    const SIMPLE_UPLOAD_LIMIT = 100 * 1024 * 1024;   // 100MB
    const CHUNK_SIZE = 20 * 1000 * 1000;             // 20MB (Cloudinary uses decimal MB for chunks typically, but bytes here)

    const shouldCompress = fileSize > COMPRESSION_THRESHOLD;

    console.log(`[CloudUploadService] File size: ${(fileSize / (1024*1024)).toFixed(2)} MB`);
    console.log(`[CloudUploadService] Strategy: ${shouldCompress ? 'Compress & Upload' : 'Direct Upload'}`);

    let result;
    const startTime = Date.now();

    if (shouldCompress) {
        console.log('[CloudUploadService] File exceeds 200MB. Compressing to fit Cloudinary limits...');
        console.time('compression');
        const compressedPath = filePath + ".compressed.mp4";
        
        try {
            await new Promise((resolve, reject) => {
                ffmpeg(filePath)
                    .outputOptions([
                        '-vcodec libx264',
                        '-crf 28',
                        '-preset ultrafast', // Minimize lookahead memory
                        '-threads 1',        // Reduce thread buffer overhead
                        '-vf scale=-2:720',  // Cap resolution at 720p
                        '-acodec aac',
                        '-b:a 128k',
                        '-bufsize 2M'        // Strict bitrate buffer
                    ])
                    .save(compressedPath)
                    .on('end', () => resolve())
                    .on('error', (err) => reject(err));
            });
            console.timeEnd('compression');

            // Check if compression worked
            const newStats = fs.statSync(compressedPath);
            console.log(`[CloudUploadService] Compressed size: ${(newStats.size / (1024*1024)).toFixed(2)} MB`);

            if (newStats.size < fileSize) {
                // Remove original and use compressed
                fs.unlinkSync(filePath);
                filePath = compressedPath;
            } else {
                console.warn('[CloudUploadService] Compression did not reduce size. Using original file.');
                fs.unlinkSync(compressedPath);
            }
        } catch (compressionError) {
            console.error('[CloudUploadService] Compression failed:', compressionError);
            // Fallback to original
            if (fs.existsSync(compressedPath)) fs.unlinkSync(compressedPath);
        }
    } else {
        console.log('[CloudUploadService] Skipping compression (< 200MB).');
    }

    // Re-check size after potential compression
    const finalStats = fs.statSync(filePath);
    const finalSize = finalStats.size;

    console.time('upload');
    if (finalSize < SIMPLE_UPLOAD_LIMIT) {
        // Use standard upload for smaller files
        console.log('[CloudUploadService] Starting standard upload (< 100MB)...');
        result = await cloudinary.uploader.upload(filePath, {
            resource_type: "video",
        });
    } else {
        // Use chunked upload for larger files
        console.log(`[CloudUploadService] Starting chunked upload (> 100MB). Chunk size: ${CHUNK_SIZE/1000000}MB...`);
        result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_large(filePath, {
                resource_type: "video",
                chunk_size: CHUNK_SIZE,
            }, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            });
        });
    }
    console.timeEnd('upload');
    
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`[CloudUploadService] Total processing time: ${totalTime.toFixed(2)}s`);

    console.log('[CloudUploadService] Cloudinary upload success:', { 
        public_id: result.public_id, 
        secure_url: result.secure_url,
        url: result.url,
        keys: Object.keys(result)
    });

    const url = result.secure_url || result.url;
    if (!url) {
        throw new Error("Cloudinary upload returned no URL");
    }

    // Update video with Cloudinary details
    video.storedFilename = result.public_id;
    video.filepath = url;
    video.status = "processing"; // Move to processing state
    await video.save();

    // Clean up local file
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('[CloudUploadService] Local file cleaned up');
        }
    } catch (cleanupError) {
        console.error('[CloudUploadService] Error cleaning up local file:', cleanupError);
    }

    // Trigger video processing (metadata, sensitivity, etc.)
    // We pass 'io' so processVideo can emit events
    await processVideo(videoId, io);

  } catch (error) {
    console.error('[CloudUploadService] Upload error:', error);
    
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
            console.error('[CloudUploadService] Error emitting failure event:', emitError);
        }
    }

    // Try to clean up local file even on error
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (cleanupError) {
        console.error('[CloudUploadService] Error cleaning up local file on failure:', cleanupError);
    }
  }
};
