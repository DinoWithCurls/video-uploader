import { createContext, useState, useEffect, type ReactNode } from "react";
import { authAPI } from "../services/api";
import logger from "../utils/logger";

export type User = {
  id?: string | number;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: any;
};

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

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    logger.log('[AuthContext.checkAuth] Checking authentication');
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      try {
        const response = await authAPI.getCurrentUser();
        setUser(response.data.user);
        setToken(storedToken);
        logger.log('[AuthContext.checkAuth] User authenticated:', { userId: response.data.user.id, role: response.data.user.role });
      } catch (err) {
        logger.error('[AuthContext.checkAuth] Error:', err);
        localStorage.removeItem("token");
        setToken(null);
      }
    } else {
      logger.log('[AuthContext.checkAuth] No token found');
    }
    setLoading(false);
  };

  const register = async (userData: any) => {
    try {
      logger.log('[AuthContext.register] Entry:', { email: userData.email, name: userData.name });
      setError(null);
      const response = await authAPI.register(userData);
      const { token: newToken, user } = response.data;
      localStorage.setItem("token", newToken);
      setToken(newToken);
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
      const { token: newToken, user } = response.data;
      localStorage.setItem("token", newToken);
      setToken(newToken);
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

  const logout = () => {
    logger.log('[AuthContext.logout] Logging out user');
    localStorage.removeItem("token");
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
