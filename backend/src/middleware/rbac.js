import Video from "../models/Video.js";

/**
 * Middleware to check if user has required role(s)
 * @param {string|string[]} roles - Required role(s)
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    console.log('[RBAC.requireRole] Entry:', { userId: req.user?.id, userRole: req.user?.role, requiredRoles: roles });
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!req.user) {
      console.log('[RBAC.requireRole] No user in request');
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log('[RBAC.requireRole] Insufficient permissions:', { required: allowedRoles, current: req.user.role });
      return res.status(403).json({
        message: "Insufficient permissions",
        required: allowedRoles,
        current: req.user.role,
      });
    }

    console.log('[RBAC.requireRole] Success: Role authorized');
    next();
  };
};

/**
 * Middleware to check if user owns the resource or is an admin
 * Requires video ID in req.params.id
 */
export const requireOwnershipOrAdmin = async (req, res, next) => {
  try {
    console.log('[RBAC.requireOwnershipOrAdmin] Entry:', { videoId: req.params.id, userId: req.user.id, role: req.user.role });
    const videoId = req.params.id;

    if (!videoId) {
      console.log('[RBAC.requireOwnershipOrAdmin] No video ID provided');
      return res.status(400).json({ message: "Video ID is required" });
    }

    const video = await Video.findById(videoId);

    if (!video) {
      console.log('[RBAC.requireOwnershipOrAdmin] Video not found:', videoId);
      return res.status(404).json({ message: "Video not found" });
    }

    // Admin can access everything
    if (req.user.role === "admin") {
      console.log('[RBAC.requireOwnershipOrAdmin] Admin access granted');
      req.video = video;
      return next();
    }

    // Check ownership
    if (video.uploadedBy.toString() !== req.user.id) {
      console.log('[RBAC.requireOwnershipOrAdmin] Access denied: Not owner', { videoOwner: video.uploadedBy, requestUser: req.user.id });
      return res.status(403).json({
        message: "Access denied. You can only access your own videos.",
      });
    }

    // Attach video to request for use in controller
    console.log('[RBAC.requireOwnershipOrAdmin] Success: Owner access granted');
    req.video = video;
    next();
  } catch (error) {
    console.error("[RBAC.requireOwnershipOrAdmin] Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Middleware to check if user can modify the resource
 * Only editors and admins can modify, and must own the resource (unless admin)
 */
export const canModify = async (req, res, next) => {
  try {
    console.log('[RBAC.canModify] Entry:', { userId: req.user.id, role: req.user.role });
    // Check role first
    if (!["editor", "admin"].includes(req.user.role)) {
      console.log('[RBAC.canModify] Insufficient role:', req.user.role);
      return res.status(403).json({
        message: "Only editors and admins can modify videos",
      });
    }

    // Then check ownership (reuse the ownership check)
    await requireOwnershipOrAdmin(req, res, next);
  } catch (error) {
    console.error("[RBAC.canModify] Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
