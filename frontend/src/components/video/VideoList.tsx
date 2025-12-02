import React, { useState, useEffect } from "react";
import { useVideos } from "../../hooks/useVideos";
import { useAuth } from "../../hooks/useAuth";
import VideoCard from "./VideoCard";

const VideoList: React.FC = () => {
  const { videos, loading, error, pagination, fetchVideos, deleteVideo } =
    useVideos();
  const { user } = useAuth();

  const [filters, setFilters] = useState({
    status: "",
    sensitivityStatus: "",
    search: "",
    sortBy: "createdAt",
    order: "desc" as "asc" | "desc",
    page: 1,
    limit: 12,
  });

  useEffect(() => {
    fetchVideos(filters);
  }, [filters, fetchVideos]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this video?")) {
      try {
        await deleteVideo(id);
      } catch (err) {
        console.error("Error deleting video:", err);
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const canDelete = user?.role === "editor" || user?.role === "admin";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Videos</h2>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search videos..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Sensitivity Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Sensitivity
            </label>
            <select
              value={filters.sensitivityStatus}
              onChange={(e) =>
                handleFilterChange("sensitivityStatus", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="safe">Safe</option>
              <option value="flagged">Flagged</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium mb-1">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="createdAt">Upload Date</option>
              <option value="title">Title</option>
              <option value="filesize">File Size</option>
              <option value="duration">Duration</option>
            </select>
          </div>

          {/* Order */}
          <div>
            <label className="block text-sm font-medium mb-1">Order</label>
            <select
              value={filters.order}
              onChange={(e) =>
                handleFilterChange("order", e.target.value as "asc" | "desc")
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading videos...</p>
        </div>
      )}

      {/* Video Grid */}
      {!loading && videos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard
              key={video._id}
              video={video}
              onDelete={canDelete ? handleDelete : undefined}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && videos.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">📹</div>
          <h3 className="text-xl font-semibold mb-2">No videos found</h3>
          <p className="text-gray-600">
            {filters.search || filters.status || filters.sensitivityStatus
              ? "Try adjusting your filters"
              : "Upload your first video to get started"}
          </p>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => handlePageChange(filters.page - 1)}
            disabled={filters.page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <span className="px-4 py-2">
            Page {filters.page} of {pagination.pages}
          </span>

          <button
            onClick={() => handlePageChange(filters.page + 1)}
            disabled={filters.page === pagination.pages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoList;
