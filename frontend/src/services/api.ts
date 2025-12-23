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
    // Token is now handled by cookies automatically via withCredentials: true
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Cookie is automatically cleared or invalid
      // Redirect to login if needed, though usually handled by protected route wrappers
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
         // Optional: logic to redirect or state update
         // window.location.href = "/login"; // Kept but can be handled by context
      }
    }
    return Promise.reject(error);
  }
);

// Auth API functions
// Auth API functions
export const authAPI = {
  register: (userData: any) => api.post("/auth/signup", userData),
  login: (credentials: any) => api.post("/auth/login", credentials),
  getCurrentUser: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

export default api;
