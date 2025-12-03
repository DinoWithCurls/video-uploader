import User from "../models/User.js";

/**
 * Get all users
 * GET /api/users
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

/**
 * Update user role
 * PUT /api/users/:id/role
 */
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    if (!["admin", "editor", "viewer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Prevent modifying own role to avoid locking oneself out
    if (userId === req.user.id) {
      return res.status(400).json({ message: "You cannot change your own role" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User role updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({ message: "Error updating user role" });
  }
};
