import React from "react";
import type { Video } from "../../services/videoService";
import { useNavigate } from "react-router-dom";

interface VideoCardProps {
  video: Video;
  onDelete?: (id: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onDelete }) => {
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return badges[status as keyof typeof badges] || "bg-gray-100 text-gray-800";
  };

  const getSensitivityBadge = (status: string) => {
    const badges = {
      safe: "bg-green-100 text-green-800",
      flagged: "bg-red-100 text-red-800",
      pending: "bg-gray-100 text-gray-800",
    };
    return badges[status as keyof typeof badges] || "bg-gray-100 text-gray-800";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      {/* Thumbnail Placeholder */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 h-48 flex items-center justify-center">
        <div className="text-white text-6xl">🎬</div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-lg line-clamp-2">{video.title}</h3>

        {/* Description */}
        {video.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {video.description}
          </p>
        )}

        {/* Metadata */}
        <div className="text-sm text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Size:</span>
            <span>{formatFileSize(video.filesize)}</span>
          </div>
          {video.duration > 0 && (
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>{formatDuration(video.duration)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Uploaded:</span>
            <span>{formatDate(video.createdAt)}</span>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex gap-2 flex-wrap">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(
              video.status
            )}`}
          >
            {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${getSensitivityBadge(
              video.sensitivityStatus
            )}`}
          >
            {video.sensitivityStatus === "safe" && "✓ Safe"}
            {video.sensitivityStatus === "flagged" && "⚠ Flagged"}
            {video.sensitivityStatus === "pending" && "⏳ Pending"}
          </span>
        </div>

        {/* Processing Progress */}
        {video.status === "processing" && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Processing...</span>
              <span>{video.processingProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${video.processingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Flagged Reasons */}
        {video.sensitivityStatus === "flagged" &&
          video.flaggedReasons.length > 0 && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              <p className="font-medium">Flagged reasons:</p>
              <ul className="list-disc list-inside">
                {video.flaggedReasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => navigate(`/videos/${video._id}`)}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            View
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(video._id)}
              className="bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
