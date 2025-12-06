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

    // Determine upload method based on file size (50MB threshold for chunking)
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const isLargeFile = fileSize > 50 * 1024 * 1024; // 50MB

    console.log(`[CloudUploadService] Uploading ${isLargeFile ? 'large (>50MB)' : 'standard (<50MB)'} file (${fileSize} bytes)`);

    let result;

    // ... inside processUpload ...

    if (isLargeFile) {
        console.log('[CloudUploadService] File exceeds 50MB. Compressing to fit Cloudinary limits...');
        const compressedPath = filePath + ".compressed.mp4";
        
        try {
            await new Promise((resolve, reject) => {
                ffmpeg(filePath)
                    .outputOptions([
                        '-vcodec libx264',
                        '-crf 28',
                        '-preset fast',
                        '-acodec aac',
                        '-b:a 128k'
                    ])
                    .save(compressedPath)
                    .on('end', () => resolve())
                    .on('error', (err) => reject(err));
            });

            // Check if compression worked
            const newStats = fs.statSync(compressedPath);
            console.log(`[CloudUploadService] Compressed size: ${newStats.size} bytes`);

            if (newStats.size < fileSize) {
                // Remove original and use compressed
                fs.unlinkSync(filePath);
                filePath = compressedPath;
                
                // If now < 100MB, use standard upload
                if (newStats.size < 100 * 1024 * 1024) {
                    console.log('[CloudUploadService] Compressed file is < 100MB. Using standard upload.');
                    result = await cloudinary.uploader.upload(filePath, {
                        resource_type: "video",
                    });
                } else {
                    // Still > 100MB, try upload_large (might fail if strict limit)
                    console.log('[CloudUploadService] Compressed file still > 100MB. Trying chunked upload...');
                    result = await new Promise((resolve, reject) => {
                        cloudinary.uploader.upload_large(filePath, {
                            resource_type: "video",
                            chunk_size: 6000000,
                        }, (error, result) => {
                            if (error) return reject(error);
                            resolve(result);
                        });
                    });
                }
            } else {
                console.warn('[CloudUploadService] Compression did not reduce size. Trying original file...');
                fs.unlinkSync(compressedPath); // Delete useless compressed file
                // Fallback to original upload_large logic
                 result = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_large(filePath, {
                        resource_type: "video",
                        chunk_size: 6000000,
                    }, (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    });
                });
            }
        } catch (compressionError) {
            console.error('[CloudUploadService] Compression failed:', compressionError);
            
            // Clean up potentially failed compressed file
            try {
                if (fs.existsSync(compressedPath)) {
                    fs.unlinkSync(compressedPath);
                }
            } catch (cleanupErr) {
                console.error('[CloudUploadService] Failed to clean up compressed file:', cleanupErr);
            }

            // Fallback to original upload_large logic
             result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_large(filePath, {
                    resource_type: "video",
                    chunk_size: 6000000,
                }, (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                });
            });
        }
    } else {
        // Use standard upload for smaller files
        console.log('[CloudUploadService] Starting standard upload...');
        result = await cloudinary.uploader.upload(filePath, {
            resource_type: "video",
        });
    }

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
