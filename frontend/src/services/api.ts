import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Add token to every request automatically
api.interceptors.request.use(
  (config) => {
    console.log('[API.interceptor.request]', { method: config.method, url: config.url });
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[API.interceptor.request] Error:', error);
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => {
    console.log('[API.interceptor.response] Success:', { status: response.status, url: response.config.url });
    return response;
  },
  (error) => {
    console.error('[API.interceptor.response] Error:', { status: error.response?.status, url: error.config?.url });
    if (error.response?.status === 401) {
      console.log('[API.interceptor.response] Unauthorized - redirecting to login');
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  register: (userData: any) => api.post("/auth/signup", userData),
  login: (credentials: any) => api.post("/auth/login", credentials),
  getCurrentUser: () => api.get("/auth/me"),
};

export default api;
