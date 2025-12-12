import React, { useState, useRef, useEffect } from "react";
import { compressVideo } from "../../utils/ffmpeg";
import { useVideos } from "../../hooks/useVideos";
import Toast from "../common/Toast";
import logger from "../../utils/logger";

const VideoUpload: React.FC = () => {
  const { uploadVideo, videos } = useVideos();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info" | "warning"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track the uploaded video's status from global context
  const uploadedVideo = videos.find(v => v._id === uploadedVideoId);

  const showToast = (type: "success" | "error" | "info" | "warning", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Protect against accidental refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploading || compressing) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [uploading, compressing]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    logger.log('[VideoUpload.handleFileSelect] Entry:', { filename: file.name, size: file.size, type: file.type });
    // Validate file type
    const validTypes = ["video/mp4", "video/webm", "video/avi", "video/quicktime"];
    if (!validTypes.includes(file.type)) {
      logger.log('[VideoUpload.handleFileSelect] Invalid file type:', file.type);
      const errorMsg = "Invalid file type. Please upload a video file (MP4, WebM, AVI, MOV)";
      setError(errorMsg);
      showToast("error", errorMsg);
      return;
    }

    // Validate file size (500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      logger.log('[VideoUpload.handleFileSelect] File too large:', file.size);
      const errorMsg = "File too large. Maximum size is 500MB";
      setError(errorMsg);
      showToast("error", errorMsg);
      return;
    }

    logger.log('[VideoUpload.handleFileSelect] File selected successfully');
    setSelectedFile(file);
    setError(null);
    setSuccess(false);
    setUploadedVideoId(null); // Reset previous upload tracking
    showToast("success", "File selected successfully");
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.log('[VideoUpload.handleSubmit] Entry:', { title, hasFile: !!selectedFile });

    if (!selectedFile) {
      logger.log('[VideoUpload.handleSubmit] No file selected');
      const errorMsg = "Please select a video file";
      setError(errorMsg);
      showToast("error", errorMsg);
      return;
    }

    if (!title.trim()) {
      logger.log('[VideoUpload.handleSubmit] No title provided');
      const errorMsg = "Please enter a title";
      setError(errorMsg);
      showToast("error", errorMsg);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);
    setUploadedVideoId(null);
    
    // Reset compression state
    setCompressing(false);
    setCompressionProgress(0);

    try {
      let fileToUpload = selectedFile;

      // Check for compression need (> 100MB)
      // Cloudinary Free Tier limit is 100MB
      /* 
         NOTE: We compress if > 100MB to ensure we can upload.
         This runs CLIENT-SIDE to save server resources and avoid OOM.
      */
      if (selectedFile.size > 100 * 1024 * 1024) {
          logger.log('[VideoUpload] File > 100MB, starting client-side compression...');
          setCompressing(true);
          setUploading(false); // Technically not uploading yet

          try {
            const compressedBlob = await compressVideo(selectedFile, (progress) => {
                setCompressionProgress(progress);
            });
            
            // Create a new File object from the blob to satisfy the upload interface
            fileToUpload = new File([compressedBlob], selectedFile.name, {
                type: 'video/mp4',
                lastModified: Date.now()
            });

            logger.log('[VideoUpload] Compression complete. Original:', selectedFile.size, 'Compressed:', fileToUpload.size);
            
            setCompressing(false);
            setUploading(true); // Now we start uploading
          } catch (compError: any) {
              logger.error('[VideoUpload] Compression failed:', compError);
              throw new Error("Failed to compress video. Please try a smaller file or checked your connection.");
          }
      }

      const newVideoId = await uploadVideo(
        fileToUpload,
        { title, description },
        (progress) => {
          setUploadProgress(progress);
        }
      );

      logger.log('[VideoUpload.handleSubmit] Upload successful, ID:', newVideoId);
      setSuccess(true);
      setUploadedVideoId(newVideoId);
      
      showToast("success", "Video uploaded! Processing in background...");
      
      // Clear form but keep success state for progress tracking
      setTitle("");
      setDescription("");
      setSelectedFile(null);
      setUploadProgress(0);
      setCompressionProgress(0);

    } catch (err: any) {
      logger.error('[VideoUpload.handleSubmit] Upload error:', err);
      const errorMsg = err.message || "Error uploading video";
      setError(errorMsg);
      showToast("error", errorMsg);
    } finally {
      setUploading(false);
      setCompressing(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const resetForm = () => {
      setSuccess(false);
      setUploadedVideoId(null);
      setSelectedFile(null);
      setTitle("");
      setDescription("");
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Upload Video</h2>

      {!success ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Drag and Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <div className="text-4xl">🎬</div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl">📁</div>
                  <p className="text-gray-600">
                    Drag and drop your video here, or{" "}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-sm text-gray-500">
                    Supported formats: MP4, WebM, AVI, MOV (Max 500MB)
                  </p>
                </div>
              )}
            </div>

            {/* Title Input */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter video title"
                required
              />
            </div>

            {/* Description Input */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter video description (optional)"
              />
            </div>

            {/* Compression Progress */}
            {compressing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700 font-medium">Optimizing video for upload... (This may take a minute)</span>
                  <span className="font-bold">{compressionProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300 relative overflow-hidden"
                    style={{ width: `${compressionProgress}%` }}
                  >
                     <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}></div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">Do not close this tab. Processing happens offline on your device.</p>
              </div>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading to server...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={uploading || compressing || !selectedFile || !title.trim()}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {compressing ? `Optimizing (${compressionProgress}%)` : uploading ? `Uploading (${uploadProgress}%)` : "Upload Video"}
            </button>
          </form>
      ) : (
          /* Processing State View */
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center space-y-6">
              <div className="text-6xl animate-bounce">🎬</div>
              
              <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">
                      {uploadedVideo?.status === 'completed' ? 'Processing Complete!' : 'Processing Video...'}
                  </h3>
                  <p className="text-gray-500">
                      {uploadedVideo?.status === 'completed' 
                          ? 'Your video is ready to watch.' 
                          : 'We are compressing and analyzing your video. You can leave this page.'}
                  </p>
              </div>

              {/* Backend Processing Progress */}
              {uploadedVideo && uploadedVideo.status !== 'completed' && uploadedVideo.status !== 'failed' && (
                  <div className="max-w-md mx-auto space-y-2">
                      <div className="flex justify-between text-sm font-medium text-gray-600">
                          <span>Processing...</span>
                          <span>{uploadedVideo.processingProgress || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                              className="bg-blue-500 h-full rounded-full transition-all duration-500 ease-out relative"
                              style={{ width: `${uploadedVideo.processingProgress || 0}%` }}
                          >
                               <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite] w-full h-full" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}></div>
                          </div>
                      </div>
                      <p className="text-xs text-gray-400">Step: {uploadedVideo.processingProgress < 25 ? 'Metadata' : uploadedVideo.processingProgress < 50 ? 'Thumbnail' : uploadedVideo.processingProgress < 75 ? 'Optimization' : 'Finalizing'}</p>
                  </div>
              )}

              {uploadedVideo?.status === 'failed' && (
                   <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                       Processing failed. Please try again.
                   </div>
              )}

              <div className="flex gap-4 justify-center pt-4">
                  <button
                      onClick={resetForm}
                      className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                      Upload Another
                  </button>
                  {uploadedVideo?.status === 'completed' && (
                      <a
                          href={`/videos/${uploadedVideoId}`}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                          View Video
                      </a>
                  )}
              </div>
          </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default VideoUpload;
