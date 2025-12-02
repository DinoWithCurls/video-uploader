import React from "react";
import { useNavigate } from "react-router-dom";
import VideoUpload from "../components/video/VideoUpload";

const VideoUploadPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/videos")}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← Back to Library
          </button>
          <h1 className="text-3xl font-bold">Upload New Video</h1>
          <p className="text-gray-600 mt-1">
            Upload a video for processing and sensitivity analysis
          </p>
        </div>

        {/* Upload Component */}
        <VideoUpload />

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            📋 Upload Instructions
          </h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Supported formats: MP4, WebM, AVI, MOV</li>
            <li>Maximum file size: 500MB</li>
            <li>
              Videos will be automatically processed for sensitivity analysis
            </li>
            <li>You'll receive real-time updates on processing progress</li>
            <li>
              Flagged videos will display reasons for manual review
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VideoUploadPage;
