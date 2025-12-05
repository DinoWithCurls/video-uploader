import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useOrganization } from "../../contexts/OrganizationContext";
import { useState, useEffect } from "react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { organization } = useOrganization();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path ? "bg-gray-900 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white";
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  return (
    <nav className="bg-gray-800 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link to="/dashboard" className="text-white font-bold text-xl hover:text-gray-300 transition-colors">
                VideoApp
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  to="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive("/dashboard")}`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/videos"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive("/videos")}`}
                >
                  Library
                </Link>
                {(user?.role === "editor" || user?.role === "admin") && (
                  <Link
                    to="/videos/upload"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive("/videos/upload")}`}
                  >
                    Upload
                  </Link>
                )}
                {user?.role === "admin" && (
                  <>
                    <Link
                      to="/admin"
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive("/admin")}`}
                    >
                      Users
                    </Link>
                    <Link
                      to="/settings/organization"
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive("/settings/organization")}`}
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
                <span className="text-gray-300 text-sm hidden lg:block">
                  🏢 {organization.name}
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-sm hidden sm:block">
                  {user?.name}
                </span>
                <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white transition-all duration-200"
              aria-expanded={isMenuOpen}
              aria-label="Toggle menu"
            >
              <span className="sr-only">Open main menu</span>
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity duration-300"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile menu */}
      <div
        className={`md:hidden fixed top-16 left-0 right-0 bg-gray-800 z-50 shadow-xl transform transition-all duration-300 ease-in-out ${
          isMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to="/dashboard"
              onClick={closeMenu}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${isActive("/dashboard")}`}
            >
              Dashboard
            </Link>
            <Link
              to="/videos"
              onClick={closeMenu}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${isActive("/videos")}`}
            >
              Library
            </Link>
            {(user?.role === "editor" || user?.role === "admin") && (
              <Link
                to="/videos/upload"
                onClick={closeMenu}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${isActive("/videos/upload")}`}
              >
                Upload
              </Link>
            )}
            {user?.role === "admin" && (
              <>
                <Link
                  to="/admin"
                  onClick={closeMenu}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${isActive("/admin")}`}
                >
                  Users
                </Link>
                <Link
                  to="/settings/organization"
                  onClick={closeMenu}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${isActive("/settings/organization")}`}
                >
                  Org Settings
                </Link>
              </>
            )}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-700">
            <div className="px-5 space-y-3">
              {organization && (
                <div className="text-gray-300 text-sm">
                  🏢 {organization.name}
                </div>
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
                onClick={() => {
                  logout();
                  closeMenu();
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
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
