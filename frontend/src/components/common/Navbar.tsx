import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useOrganization } from "../../contexts/OrganizationContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { organization } = useOrganization();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? "bg-gray-900 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white";
  };

  return (
    <nav className="bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link to="/dashboard" className="text-white font-bold text-xl">
                VideoApp
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  to="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/dashboard")}`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/videos"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/videos")}`}
                >
                  Library
                </Link>
                {(user?.role === "editor" || user?.role === "admin") && (
                  <Link
                    to="/videos/upload"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/videos/upload")}`}
                  >
                    Upload
                  </Link>
                )}
                {user?.role === "admin" && (
                  <>
                    <Link
                      to="/admin"
                      className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/admin")}`}
                    >
                      Users
                    </Link>
                    <Link
                      to="/settings/organization"
                      className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/settings/organization")}`}
                    >
                      Org Settings
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6 gap-4">
              {organization && (
                <span className="text-gray-300 text-sm">
                  🏢 {organization.name}
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-sm">
                  {user?.name}
                </span>
                <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
