import React, { useState, useEffect } from "react";
import { useVideos } from "../../hooks/useVideos";
import { useAuth } from "../../hooks/useAuth";
import VideoCard from "./VideoCard";
import VideoFilters from "./VideoFilters";
import type { AdvancedFilters } from "./VideoFilters";
import Modal from "../common/Modal";
import Toast from "../common/Toast";
import VideoCardSkeleton from "../common/VideoCardSkeleton";

const VideoList: React.FC = () => {
  const { videos, loading, error, pagination, fetchVideos, deleteVideo } =
    useVideos();
  const { user } = useAuth();

  const [filters, setFilters] = useState<AdvancedFilters>({
    status: "",
    sensitivityStatus: "",
    search: "",
    dateFrom: null,
    dateTo: null,
    filesizeMin: null,
    filesizeMax: null,
    durationMin: null,
    durationMax: null,
    sortBy: "createdAt",
    order: "desc",
    page: 1,
    limit: 12,
  });

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; videoId: string | null; videoTitle: string }>({
    isOpen: false,
    videoId: null,
    videoTitle: "",
  });

  const [toast, setToast] = useState<{ type: "success" | "error" | "info" | "warning"; message: string } | null>(null);

  const showToast = (type: "success" | "error" | "info" | "warning", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    fetchVideos(filters);
  }, [filters, fetchVideos]);

  const handleFilterChange = (key: keyof AdvancedFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleClearAll = () => {
    setFilters({
      status: "",
      sensitivityStatus: "",
      search: "",
      dateFrom: null,
      dateTo: null,
      filesizeMin: null,
      filesizeMax: null,
      durationMin: null,
      durationMax: null,
      sortBy: "createdAt",
      order: "desc",
      page: 1,
      limit: 12,
    });
  };

  const handleDeleteClick = (id: string, title: string) => {
    setDeleteModal({ isOpen: true, videoId: id, videoTitle: title });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.videoId) return;

    try {
      await deleteVideo(deleteModal.videoId);
      showToast("success", "Video deleted successfully");
    } catch (err: any) {
      console.error("Error deleting video:", err);
      showToast("error", err.message || "Error deleting video");
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

      {/* Advanced Filters */}
      <VideoFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAll}
      />

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State with Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Video Grid */}
      {!loading && videos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard
              key={video._id}
              video={video}
              onDelete={canDelete ? (id) => handleDeleteClick(id, video.title) : undefined}
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, videoId: null, videoTitle: "" })}
        onConfirm={handleConfirmDelete}
        title="Delete Video"
        message={`Are you sure you want to delete "${deleteModal.videoTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

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

export default VideoList;
