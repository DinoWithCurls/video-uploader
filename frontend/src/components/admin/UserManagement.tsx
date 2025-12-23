import React, { useEffect, useState } from "react";
import { getUsers, updateUserRole } from "../../services/userService";
import type { User } from "../../contexts/AuthContext";
import { useAuth } from "../../hooks/useAuth";
import logger from "../../utils/logger";

// Extend User to handle backend response with _id
interface UserWithId extends User {
  _id?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      logger.log('[UserManagement.fetchUsers] Fetching users');
      const data = await getUsers();
      setUsers(data);
      logger.log('[UserManagement.fetchUsers] Success:', { count: data.length });
    } catch (err) {
      logger.error('[UserManagement.fetchUsers] Error:', err);
      setError("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string | number | undefined, newRole: string) => {
    try {
      if (!userId) {
        logger.error('[UserManagement.handleRoleChange] No user ID provided');
        alert('User ID is missing');
        return;
      }
      
      const validRole = newRole as "admin" | "editor" | "viewer";
      logger.log('[UserManagement.handleRoleChange] Entry:', { userId, newRole: validRole });
      await updateUserRole(String(userId), validRole);
      // Update local state
      setUsers(
        users.map((u) => (u._id === userId || u.id === userId ? { ...u, role: validRole } : u))
      );
      logger.log('[UserManagement.handleRoleChange] Success');
    } catch (err: any) {
      logger.error('[UserManagement.handleRoleChange] Error:', err);
      alert(err.response?.data?.message || "Failed to update role");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-500">❌</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const userId = user._id || user.id;
              logger.log('[UserManagement.render] User:', { userId, name: user.name, role: user.role });
              
              return (
                <tr key={userId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-800"
                          : user.role === "editor"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleRoleChange(userId, e.target.value)
                      }
                      disabled={userId === currentUser?.id}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
