import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { SocketProvider } from "./contexts/SocketContext.tsx";
import { VideoProvider } from "./contexts/VideoContext.tsx";
import Login from "./components/auth/Login.tsx";
import Register from "./components/auth/Register.tsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.tsx";
import { useAuth } from "./hooks/useAuth";
import VideoLibrary from "./pages/VideoLibrary.tsx";
import VideoUploadPage from "./pages/VideoUploadPage.tsx";
import VideoDetailPage from "./pages/VideoDetailPage.tsx";

// Placeholder dashboard
const Dashboard = () => {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Welcome, {user?.name}!</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {user?.role}
            </span>
            <button
              onClick={logout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a
            href="/videos"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-4">📹</div>
            <h2 className="text-xl font-semibold mb-2">Video Library</h2>
            <p className="text-gray-600">
              View and manage your uploaded videos
            </p>
          </a>

          {(user?.role === "editor" || user?.role === "admin") && (
            <a
              href="/videos/upload"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl mb-4">⬆️</div>
              <h2 className="text-xl font-semibold mb-2">Upload Video</h2>
              <p className="text-gray-600">
                Upload a new video for processing
              </p>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <VideoProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/videos"
                element={
                  <ProtectedRoute>
                    <VideoLibrary />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/videos/upload"
                element={
                  <ProtectedRoute roles={["editor", "admin"]}>
                    <VideoUploadPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/videos/:id"
                element={
                  <ProtectedRoute>
                    <VideoDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </VideoProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
