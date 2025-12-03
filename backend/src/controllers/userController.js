import User from "../models/User.js";

/**
 * Get all users
 * GET /api/users
 */
export const getAllUsers = async (req, res) => {
  try {
    console.log('[UserController.getAllUsers] Entry:', { userId: req.user.id, role: req.user.role });
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    console.log('[UserController.getAllUsers] Success:', { count: users.length });
    res.json(users);
  } catch (error) {
    console.error("[UserController.getAllUsers] Error:", error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

/**
 * Update user role
 * PUT /api/users/:id/role
 */
export const updateUserRole = async (req, res) => {
  try {
    console.log('[UserController.updateUserRole] Entry:', { targetUserId: req.params.id, newRole: req.body.role, requestUserId: req.user.id });
    const { role } = req.body;
    const userId = req.params.id;

    if (!["admin", "editor", "viewer"].includes(role)) {
      console.log('[UserController.updateUserRole] Invalid role:', role);
      return res.status(400).json({ message: "Invalid role" });
    }

    // Prevent modifying own role to avoid locking oneself out
    if (userId === req.user.id) {
      console.log('[UserController.updateUserRole] Cannot change own role');
      return res.status(400).json({ message: "You cannot change your own role" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select("-password");

    if (!user) {
      console.log('[UserController.updateUserRole] User not found:', userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log('[UserController.updateUserRole] Success:', { userId: user._id, newRole: user.role });
    res.json({
      message: "User role updated successfully",
      user,
    });
  } catch (error) {
    console.error("[UserController.updateUserRole] Error:", error);
    res.status(500).json({ message: "Error updating user role" });
  }
};
