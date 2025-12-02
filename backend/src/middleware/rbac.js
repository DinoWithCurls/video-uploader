import Video from "../models/Video.js";

/**
 * Middleware to check if user has required role(s)
 * @param {string|string[]} roles - Required role(s)
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Insufficient permissions",
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
};

/**
 * Middleware to check if user owns the resource or is an admin
 * Requires video ID in req.params.id
 */
export const requireOwnershipOrAdmin = async (req, res, next) => {
  try {
    const videoId = req.params.id;

    if (!videoId) {
      return res.status(400).json({ message: "Video ID is required" });
    }

    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Admin can access everything
    if (req.user.role === "admin") {
      req.video = video;
      return next();
    }

    // Check ownership
    if (video.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Access denied. You can only access your own videos.",
      });
    }

    // Attach video to request for use in controller
    req.video = video;
    next();
  } catch (error) {
    console.error("Error in requireOwnershipOrAdmin:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Middleware to check if user can modify the resource
 * Only editors and admins can modify, and must own the resource (unless admin)
 */
export const canModify = async (req, res, next) => {
  try {
    // Check role first
    if (!["editor", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Only editors and admins can modify videos",
      });
    }

    // Then check ownership (reuse the ownership check)
    await requireOwnershipOrAdmin(req, res, next);
  } catch (error) {
    console.error("Error in canModify:", error);
    res.status(500).json({ message: "Server error" });
  }
};
