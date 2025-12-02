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
  loading: boolean;
  error: string | null;
  register: (userData: any) => Promise<{ success: boolean; error?: string }>;
  login: (credentials: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const response = await authAPI.getCurrentUser();
        setUser(response.data.user);
      } catch (err) {
        console.error(err);
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  };

  const register = async (userData: any) => {
    try {
      setError(null);
      const response = await authAPI.register(userData);
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      setUser(user);
      return { success: true };
    } catch (err: any) {
      console.error(err);
      const message = err.response?.data?.message || "Registration failed";
      setError(message);
      return { success: false, error: message };
    }
  };

  const login = async (credentials: any) => {
    try {
      setError(null);
      const response = await authAPI.login(credentials);
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      setUser(user);
      return { success: true };
    } catch (err: any) {
      const message = err.response?.data?.message || "Login failed";
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, error, register, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
