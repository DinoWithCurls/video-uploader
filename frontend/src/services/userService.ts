import api from "./api";
import type { User } from "../contexts/AuthContext";

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get("/users");
  return response.data;
};

export const updateUserRole = async (
  userId: string,
  role: "admin" | "editor" | "viewer"
): Promise<{ message: string; user: User }> => {
  const response = await api.put(`/users/${userId}/role`, { role });
  return response.data;
};
