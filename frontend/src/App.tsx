import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { SocketProvider } from "./contexts/SocketContext.tsx";
import { VideoProvider } from "./contexts/VideoContext.tsx";
import { OrganizationProvider } from "./contexts/OrganizationContext.tsx";
import Login from "./components/auth/Login.tsx";
import Register from "./components/auth/Register.tsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.tsx";
import { useAuth } from "./hooks/useAuth";
import VideoLibrary from "./pages/VideoLibrary.tsx";
import VideoUploadPage from "./pages/VideoUploadPage.tsx";
import VideoDetailPage from "./pages/VideoDetailPage.tsx";
import UserManagement from "./components/admin/UserManagement.tsx";
import OrganizationSettings from "./components/admin/OrganizationSettings.tsx";
import SuperAdminDashboard from "./pages/SuperAdminDashboard.tsx";
import Layout from "./components/common/Layout.tsx";

// Dashboard component with organization display
const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user?.name}!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

          {user?.role === "admin" && (
            <>
              <a
                href="/admin"
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">👥</div>
                <h2 className="text-xl font-semibold mb-2">User Management</h2>
                <p className="text-gray-600">
                  Manage users and update their roles
                </p>
              </a>
              <a
                href="/settings/organization"
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">⚙️</div>
                <h2 className="text-xl font-semibold mb-2">Org Settings</h2>
                <p className="text-gray-600">
                  Manage organization-wide settings
                </p>
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <OrganizationProvider>
          <SocketProvider>
            <VideoProvider>
                <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Protected Routes with Layout */}
                <Route element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/videos" element={<VideoLibrary />} />
                  <Route
                    path="/videos/upload"
                    element={
                      <ProtectedRoute roles={["editor", "admin"]}>
                        <VideoUploadPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/videos/:id" element={<VideoDetailPage />} />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute roles={["admin"]}>
                        <UserManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/organization"
                    element={
                      <ProtectedRoute roles={["admin"]}>
                        <OrganizationSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/superadmin"
                    element={
                      <ProtectedRoute roles={["superadmin"]}>
                        <SuperAdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                <Route path="/" element={<Navigate to="/dashboard" />} />
              </Routes>
            </VideoProvider>
          </SocketProvider>
        </OrganizationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
