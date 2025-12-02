import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import VideoList from "../components/video/VideoList";

const VideoLibrary: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const canUpload = user?.role === "editor" || user?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Video Library</h1>
            <p className="text-gray-600 mt-1">
              Manage and view your uploaded videos
            </p>
          </div>
          {canUpload && (
            <button
              onClick={() => navigate("/videos/upload")}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span>➕</span>
              Upload Video
            </button>
          )}
        </div>

        {/* Video List */}
        <VideoList />
      </div>
    </div>
  );
};

export default VideoLibrary;
