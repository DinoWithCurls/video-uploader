import React, { createContext, useState, useCallback, useEffect } from "react";
import type { Video, VideoFilters } from "../services/videoService";
import logger from "../utils/logger";
import {
  getVideos as fetchVideosAPI,
  deleteVideo as deleteVideoAPI,
  updateVideo as updateVideoAPI,
  uploadVideo as uploadVideoAPI,
} from "../services/videoService";
import { useSocket } from "../hooks/useSocket";

interface VideoContextType {
  videos: Video[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null;
  fetchVideos: (filters?: VideoFilters) => Promise<void>;
  uploadVideo: (
    file: File,
    metadata: { title: string; description?: string },
    onProgress?: (progress: number) => void
  ) => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;
  updateVideo: (
    id: string,
    updates: { title?: string; description?: string }
  ) => Promise<void>;
  refreshVideos: () => Promise<void>;
}

export const VideoContext = createContext<VideoContextType | null>(null);

export const VideoProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);
  const [currentFilters, setCurrentFilters] = useState<VideoFilters>({});

  const { subscribe } = useSocket();

  // Fetch videos
  const fetchVideos = useCallback(async (filters?: VideoFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchVideosAPI(filters);
      setVideos(response.videos);
      setPagination(response.pagination);
      setCurrentFilters(filters || {});
    } catch (err: any) {
      setError(err.response?.data?.message || "Error fetching videos");
      console.error("Error fetching videos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Upload video
  const uploadVideo = useCallback(
    async (
      file: File,
      metadata: { title: string; description?: string },
      onProgress?: (progress: number) => void
    ) => {
      setError(null);
      try {
        const response = await uploadVideoAPI(file, metadata, onProgress);
        
        // Optimistically add to list
        const newVideo: Video = {
          ...response.video,
          _id: (response.video as any).id || "",
          storedFilename: "",
          duration: 0,
          resolution: { width: 0, height: 0 },
          codec: "",
          uploadedBy: { _id: "", name: "", email: "" },
          status: "pending",
          processingProgress: 0,
          sensitivityStatus: "pending",
          sensitivityScore: 0,
          flaggedReasons: [],
          updatedAt: new Date().toISOString(),
        } as Video;

        setVideos((prev) => [newVideo, ...prev]);
      } catch (err: any) {
        setError(err.response?.data?.message || "Error uploading video");
        throw err;
      }
    },
    []
  );

  // Delete video
  const deleteVideo = useCallback(async (id: string) => {
    setError(null);
    try {
      await deleteVideoAPI(id);
      setVideos((prev) => prev.filter((v) => v._id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || "Error deleting video");
      throw err;
    }
  }, []);

  // Update video
  const updateVideo = useCallback(
    async (
      id: string,
      updates: { title?: string; description?: string }
    ) => {
      setError(null);
      try {
        await updateVideoAPI(id, updates);
        setVideos((prev) =>
          prev.map((v) => (v._id === id ? { ...v, ...updates } : v))
        );
      } catch (err: any) {
        setError(err.response?.data?.message || "Error updating video");
        throw err;
      }
    },
    []
  );

  // Refresh videos with current filters
  const refreshVideos = useCallback(async () => {
    await fetchVideos(currentFilters);
  }, [fetchVideos, currentFilters]);

  // Subscribe to Socket.io events for real-time updates
  useEffect(() => {
    const unsubscribeStart = subscribe("video:processing:start", (data) => {
      logger.info("[VideoContext] Processing started:", data);
      setVideos((prev) =>
        prev.map((v) =>
          v._id === data.videoId
            ? { ...v, status: "processing", processingProgress: 0 }
            : v
        )
      );
    });

    const unsubscribeProgress = subscribe(
      "video:processing:progress",
      (data) => {
        logger.info("[VideoContext] Processing progress:", data);
        setVideos((prev) =>
          prev.map((v) =>
            v._id === data.videoId
              ? { ...v, processingProgress: data.progress }
              : v
          )
        );
      }
    );

    const unsubscribeComplete = subscribe(
      "video:processing:complete",
      (data) => {
        logger.info("[VideoContext] Processing complete:", data);
        setVideos((prev) =>
          prev.map((v) =>
            v._id === data.videoId
              ? {
                  ...v,
                  status: data.status,
                  processingProgress: 100,
                  sensitivityStatus: data.sensitivityStatus,
                  sensitivityScore: data.sensitivityScore,
                  flaggedReasons: data.flaggedReasons,
                }
              : v
          )
        );
      }
    );

    const unsubscribeError = subscribe("video:processing:error", (data) => {
      console.error("Processing error:", data);
      setVideos((prev) =>
        prev.map((v) =>
          v._id === data.videoId
            ? { ...v, status: "failed", processingProgress: 0 }
            : v
        )
      );
    });

    return () => {
      unsubscribeStart();
      unsubscribeProgress();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, [subscribe]);

  return (
    <VideoContext.Provider
      value={{
        videos,
        loading,
        error,
        pagination,
        fetchVideos,
        uploadVideo,
        deleteVideo,
        updateVideo,
        refreshVideos,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
};
