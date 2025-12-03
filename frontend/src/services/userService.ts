import api from "./api";
import type { User } from "../contexts/AuthContext";
import logger from "../utils/logger";

export const getUsers = async (): Promise<User[]> => {
  logger.log('[UserService.getUsers] Entry');
  const response = await api.get("/users");
  logger.log('[UserService.getUsers] Success:', { count: response.data.length });
  return response.data;
};

export const updateUserRole = async (
  userId: string,
  role: "admin" | "editor" | "viewer"
): Promise<{ message: string; user: User }> => {
  logger.log('[UserService.updateUserRole] Entry:', { userId, role });
  const response = await api.put(`/users/${userId}/role`, { role });
  logger.log('[UserService.updateUserRole] Success');
  return response.data;
};
