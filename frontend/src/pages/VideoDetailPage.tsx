import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getVideo, type Video } from "../services/videoService";
import VideoPlayer from "../components/video/VideoPlayer";
import { useAuth } from "../hooks/useAuth";
import { useVideos } from "../hooks/useVideos";

const VideoDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateVideo, deleteVideo } = useVideos();

  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    if (id) {
      fetchVideo(id);
    }
  }, [id]);

  const fetchVideo = async (videoId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getVideo(videoId);
      setVideo(response.video);
      setEditTitle(response.video.title);
      setEditDescription(response.video.description);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error fetching video");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!video) return;

    try {
      await updateVideo(video._id, {
        title: editTitle,
        description: editDescription,
      });
      setVideo({ ...video, title: editTitle, description: editDescription });
      setEditing(false);
    } catch (err) {
      console.error("Error updating video:", err);
    }
  };

  const handleDelete = async () => {
    if (!video) return;

    if (window.confirm("Are you sure you want to delete this video?")) {
      try {
        await deleteVideo(video._id);
        navigate("/videos");
      } catch (err) {
        console.error("Error deleting video:", err);
      }
    }
  };

  const canModify = user?.role === "editor" || user?.role === "admin";

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Video not found"}</p>
          <button
            onClick={() => navigate("/videos")}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/videos")}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← Back to Library
          </button>
        </div>

        <div className="flex flex-col lg:flex-row-reverse gap-8">
          {/* Right Column: Video Player */}
          <div className="flex-1 lg:w-2/3 lg:sticky lg:top-8 self-start">
             <div className="bg-black rounded-lg overflow-hidden shadow-lg">
                <VideoPlayer video={video} />
             </div>
          </div>

          {/* Left Column: Video Details */}
          <div className="flex-1 lg:w-1/3 space-y-6">
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              {/* Title and Description */}
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Description
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdate}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h1 className="text-2xl font-bold break-words">{video.title}</h1>
                      {video.description && (
                        <p className="text-gray-600 mt-2 whitespace-pre-wrap">{video.description}</p>
                      )}
                    </div>
                    {canModify && (
                      <button
                        onClick={() => setEditing(true)}
                        className="text-blue-600 hover:text-blue-700 ml-4 shrink-0"
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600">File Name</p>
                  <p className="font-medium break-all">{video.filename}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">File Size</p>
                  <p className="font-medium">{formatFileSize(video.filesize)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Uploaded</p>
                  <p className="font-medium">{formatDate(video.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Uploaded By</p>
                  <p className="font-medium">{video.uploadedBy.name}</p>
                </div>
              </div>

              {/* Sensitivity Analysis */}
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3">Sensitivity Analysis</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      video.sensitivityStatus === "safe"
                        ? "bg-green-100 text-green-800"
                        : video.sensitivityStatus === "flagged"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {video.sensitivityStatus === "safe" && "✓ Safe"}
                    {video.sensitivityStatus === "flagged" && "⚠ Flagged"}
                    {video.sensitivityStatus === "pending" && "⏳ Pending"}
                  </span>
                  <span className="text-sm text-gray-600">
                    Score: {video.sensitivityScore}/100
                  </span>
                </div>

                {video.sensitivityStatus === "flagged" &&
                  video.flaggedReasons.length > 0 && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="font-medium text-red-900 mb-2">
                        Flagged Reasons:
                      </p>
                      <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                        {video.flaggedReasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>

              {/* Actions */}
              {canModify && (
                <div className="pt-4 border-t">
                  <button
                    onClick={handleDelete}
                    className="w-full bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    🗑️ Delete Video
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetailPage;
