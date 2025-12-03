import { createContext, useState, useEffect, type ReactNode } from "react";
import { authAPI } from "../services/api";

type User = {
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
    console.log('[AuthContext.checkAuth] Checking authentication');
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      try {
        const response = await authAPI.getCurrentUser();
        setUser(response.data.user);
        setToken(storedToken);
        console.log('[AuthContext.checkAuth] User authenticated:', { userId: response.data.user.id, role: response.data.user.role });
      } catch (err) {
        console.error('[AuthContext.checkAuth] Error:', err);
        localStorage.removeItem("token");
        setToken(null);
      }
    } else {
      console.log('[AuthContext.checkAuth] No token found');
    }
    setLoading(false);
  };

  const register = async (userData: any) => {
    try {
      console.log('[AuthContext.register] Entry:', { email: userData.email, name: userData.name });
      setError(null);
      const response = await authAPI.register(userData);
      const { token: newToken, user } = response.data;
      localStorage.setItem("token", newToken);
      setToken(newToken);
      setUser(user);
      console.log('[AuthContext.register] Success:', { userId: user.id, role: user.role });
      return { success: true };
    } catch (err: any) {
      console.error('[AuthContext.register] Error:', err);
      const message = err.response?.data?.message || "Registration failed";
      setError(message);
      return { success: false, error: message };
    }
  };

  const login = async (credentials: any) => {
    try {
      console.log('[AuthContext.login] Entry:', { email: credentials.email });
      setError(null);
      const response = await authAPI.login(credentials);
      const { token: newToken, user } = response.data;
      localStorage.setItem("token", newToken);
      setToken(newToken);
      setUser(user);
      console.log('[AuthContext.login] Success:', { userId: user.id, role: user.role });
      return { success: true };
    } catch (err: any) {
      console.error('[AuthContext.login] Error:', err);
      const message = err.response?.data?.message || "Login failed";
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    console.log('[AuthContext.logout] Logging out user');
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    console.log('[AuthContext.logout] User logged out');
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
