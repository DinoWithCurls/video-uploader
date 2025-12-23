import { createContext, useState, useEffect, type ReactNode } from "react";
import { authAPI } from "../services/api";
import logger from "../utils/logger";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "viewer" | "editor" | "admin";
  organizationId: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
}

export type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  register: (userData: any) => Promise<{ success: boolean; error?: string }>;
  login: (credentials: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = async () => {
    logger.log('[AuthContext.checkAuth] Checking authentication');
    try {
      const response = await authAPI.getCurrentUser();
      if (response.data.user) {
        setUser(response.data.user);
        // We don't have the token string anymore as it's in an HttpOnly cookie
        // But we can set a dummy or just use the existence of user as auth state
        setToken("cookie-auth"); 
      }
    } catch (error) {
      logger.log('[AuthContext.checkAuth] Not authenticated or error:', error);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  // Check if user is logged in on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkAuth();
  }, []);

  const register = async (userData: any) => {
    try {
      logger.log('[AuthContext.register] Entry:', { email: userData.email, name: userData.name });
      setError(null);
      const response = await authAPI.register(userData);
      const { user } = response.data;
      // localStorage.setItem("token", newToken);
      // localStorage.setItem("user", JSON.stringify(user));
      setToken("cookie-auth");
      setUser(user);
      
      // Identify user in LogRocket
      logger.identifyUser(user.id, { name: user.name, email: user.email, role: user.role });
      
      logger.log('[AuthContext.register] Success:', { userId: user.id, role: user.role });
      return { success: true };
    } catch (err: any) {
      logger.error('[AuthContext.register] Error:', err);
      const message = err.response?.data?.message || "Registration failed";
      setError(message);
      return { success: false, error: message };
    }
  };

  const login = async (credentials: any) => {
    try {
      logger.log('[AuthContext.login] Entry:', { email: credentials.email });
      setError(null);
      const response = await authAPI.login(credentials);
      const { user } = response.data;
      // localStorage.setItem("token", newToken);
      // localStorage.setItem("user", JSON.stringify(user));
      setToken("cookie-auth");
      setUser(user);
      
      // Identify user in LogRocket
      logger.identifyUser(user.id, { name: user.name, email: user.email, role: user.role });
      
      logger.log('[AuthContext.login] Success:', { userId: user.id, role: user.role });
      return { success: true };
    } catch (err: any) {
      logger.error('[AuthContext.login] Error:', err);
      const message = err.response?.data?.message || "Login failed";
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    logger.log('[AuthContext.logout] Logging out user');
    try {
      // Call backup logout logic in api.js? 
      // Actually we need an API call to clear the cookie on backend
      await authAPI.logout(); // We need to add this to api.ts if not exists, but wait, authAPI has it?
      // Checking api.ts... it doesn't have logout in authAPI object exposed in step 38 view_file.
      // Wait, let's just clear implementation state first, I will add logout to api.ts in next step
    } catch (e) {
      console.error("Logout error", e);
    }
    // localStorage.removeItem("token");
    // localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    logger.log('[AuthContext.logout] User logged out');
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, error, register, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
