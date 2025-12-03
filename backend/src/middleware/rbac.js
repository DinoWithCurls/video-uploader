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
    console.log('[RBAC.requireOwnershipOrAdmin] Entry:', { videoId: req.params.id, userId: req.user.id, role: req.user.role, orgId: req.user.organizationId });
    const videoId = req.params.id;

    if (!videoId) {
      console.log('[RBAC.requireOwnershipOrAdmin] No video ID provided');
      return res.status(400).json({ message: "Video ID is required" });
    }

    // CRITICAL: Filter by organizationId to prevent cross-tenant access
    // UNLESS user is superadmin
    const query = { _id: videoId };
    if (req.user.role !== 'superadmin') {
      query.organizationId = req.user.organizationId;
    }

    const video = await Video.findOne(query);

    if (!video) {
      console.log('[RBAC.requireOwnershipOrAdmin] Video not found or access denied:', videoId);
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if user is the owner or admin or superadmin
    const isOwner = video.uploadedBy.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    const isSuperAdmin = req.user.role === "superadmin";

    if (!isOwner && !isAdmin && !isSuperAdmin) {
      console.log('[RBAC.requireOwnershipOrAdmin] User is not owner or admin');
      return res.status(403).json({
        message: "You don't have permission to access this video",
      });
    }

    // Attach video to request for further use
    req.video = video;
    console.log('[RBAC.requireOwnershipOrAdmin] Success: User authorized');
    next();
  } catch (error) {
    console.error('[RBAC.requireOwnershipOrAdmin] Error:', error);
    res.status(500).json({ message: "Error checking permissions" });
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
    if (!["editor", "admin", "superadmin"].includes(req.user.role)) {
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

/**
 * Middleware to check if user can access a video for viewing
 * All organization members can view videos in their organization
 */
export const requireOrganizationAccess = async (req, res, next) => {
  try {
    console.log('[RBAC.requireOrganizationAccess] Entry:', { videoId: req.params.id, userId: req.user.id, role: req.user.role, orgId: req.user.organizationId });
    const videoId = req.params.id;

    if (!videoId) {
      console.log('[RBAC.requireOrganizationAccess] No video ID provided');
      return res.status(400).json({ message: "Video ID is required" });
    }

    // CRITICAL: Filter by organizationId to prevent cross-tenant access
    // UNLESS user is superadmin
    const query = { _id: videoId };
    if (req.user.role !== 'superadmin') {
      query.organizationId = req.user.organizationId;
    }

    const video = await Video.findOne(query);

    if (!video) {
      console.log('[RBAC.requireOrganizationAccess] Video not found or access denied:', videoId);
      return res.status(404).json({ message: "Video not found" });
    }

    // All organization members can view videos
    // Attach video to request for further use
    req.video = video;
    console.log('[RBAC.requireOrganizationAccess] Success: Organization member authorized');
    next();
  } catch (error) {
    console.error('[RBAC.requireOrganizationAccess] Error:', error);
    res.status(500).json({ message: "Error checking permissions" });
  }
};

