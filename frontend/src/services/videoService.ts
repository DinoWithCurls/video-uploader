import axios from "axios";
import logger from "../utils/logger";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Video {
  _id: string;
  title: string;
  description: string;
  filename: string;
  storedFilename: string;
  filesize: number;
  mimetype: string;
  duration: number;
  resolution: {
    width: number;
    height: number;
  };
  codec: string;
  thumbnailUrl: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  status: "pending" | "uploading" | "processing" | "completed" | "failed";
  processingProgress: number;
  sensitivityStatus: "safe" | "flagged" | "pending";
  sensitivityScore: number;
  flaggedReasons: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VideoFilters {
  status?: string;
  sensitivityStatus?: string;
  search?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  filesizeMin?: number | null;
  filesizeMax?: number | null;
  durationMin?: number | null;
  durationMax?: number | null;
  sortBy?: string;
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface VideosResponse {
  videos: Video[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Upload a video file
 */
export const uploadVideo = async (
  file: File,
  metadata: { title: string; description?: string },
  onProgress?: (progress: number) => void
): Promise<{ video: Partial<Video> }> => {
  logger.log('[VideoService.uploadVideo] Entry:', { filename: file.name, size: file.size, title: metadata.title });
  const formData = new FormData();
  formData.append("video", file);
  formData.append("title", metadata.title);
  if (metadata.description) {
    formData.append("description", metadata.description);
  }

  const response = await api.post("/videos/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });

  logger.log('[VideoService.uploadVideo] Success:', { videoId: response.data.video.id });
  return response.data;
};

/**
 * Get videos with optional filters
 */
export const getVideos = async (
  filters?: VideoFilters
): Promise<VideosResponse> => {
  logger.log('[VideoService.getVideos] Entry:', filters);
  const response = await api.get("/videos", { params: filters });
  logger.log('[VideoService.getVideos] Success:', { count: response.data.videos.length, total: response.data.pagination.total });
  return response.data;
};

/**
 * Get a single video by ID
 */
export const getVideo = async (id: string): Promise<{ video: Video }> => {
  logger.log('[VideoService.getVideo] Entry:', { id });
  const response = await api.get(`/videos/${id}`);
  logger.log('[VideoService.getVideo] Success:', { videoId: response.data.video._id, title: response.data.video.title });
  return response.data;
};

/**
 * Update video metadata
 */
export const updateVideo = async (
  id: string,
  updates: { title?: string; description?: string }
): Promise<{ video: Partial<Video> }> => {
  logger.log('[VideoService.updateVideo] Entry:', { id, updates });
  const response = await api.put(`/videos/${id}`, updates);
  logger.log('[VideoService.updateVideo] Success');
  return response.data;
};

/**
 * Delete a video
 */
export const deleteVideo = async (id: string): Promise<void> => {
  logger.log('[VideoService.deleteVideo] Entry:', { id });
  await api.delete(`/videos/${id}`);
  logger.log('[VideoService.deleteVideo] Success');
};

/**
 * Get streaming URL for a video
 */
export const getStreamUrl = (id: string): string => {
  const token = localStorage.getItem("token");
  const url = `${API_URL}/videos/${id}/stream?token=${token}`;
  logger.log('[VideoService.getStreamUrl]', { id, url });
  return url;
};

/**
 * Admin: Get all videos from all users
 */
export const getAllVideosAdmin = async (
  filters?: VideoFilters
): Promise<VideosResponse> => {
  logger.log('[VideoService.getAllVideosAdmin] Entry:', filters);
  const response = await api.get("/videos/admin/all", { params: filters });
  logger.log('[VideoService.getAllVideosAdmin] Success:', { count: response.data.videos.length });
  return response.data;
};
