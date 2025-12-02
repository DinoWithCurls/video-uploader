import axios from "axios";

const API_URL = "http://localhost:5000/api";

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
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  status: "pending" | "processing" | "completed" | "failed";
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

  return response.data;
};

/**
 * Get videos with optional filters
 */
export const getVideos = async (
  filters?: VideoFilters
): Promise<VideosResponse> => {
  const response = await api.get("/videos", { params: filters });
  return response.data;
};

/**
 * Get a single video by ID
 */
export const getVideo = async (id: string): Promise<{ video: Video }> => {
  const response = await api.get(`/videos/${id}`);
  return response.data;
};

/**
 * Update video metadata
 */
export const updateVideo = async (
  id: string,
  updates: { title?: string; description?: string }
): Promise<{ video: Partial<Video> }> => {
  const response = await api.put(`/videos/${id}`, updates);
  return response.data;
};

/**
 * Delete a video
 */
export const deleteVideo = async (id: string): Promise<void> => {
  await api.delete(`/videos/${id}`);
};

/**
 * Get streaming URL for a video
 */
export const getStreamUrl = (id: string): string => {
  const token = localStorage.getItem("token");
  return `${API_URL}/videos/${id}/stream?token=${token}`;
};

/**
 * Admin: Get all videos from all users
 */
export const getAllVideosAdmin = async (
  filters?: VideoFilters
): Promise<VideosResponse> => {
  const response = await api.get("/videos/admin/all", { params: filters });
  return response.data;
};
