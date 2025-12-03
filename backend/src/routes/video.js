import express from "express";
import {
  uploadVideo,
  getVideos,
  getVideo,
  streamVideo,
  updateVideo,
  deleteVideo,
  getAllVideosAdmin,
} from "../controllers/videoController.js";
import { auth } from "../middleware/auth.js";
import {
  requireRole,
  requireOwnershipOrAdmin,
  canModify,
  requireOrganizationAccess,
} from "../middleware/rbac.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// All routes require authentication
router.use(auth);

// Upload video (editors and admins only)
router.post(
  "/upload",
  requireRole(["editor", "admin"]),
  upload.single("video"),
  uploadVideo
);

// Get videos (filtered by user, unless admin)
router.get("/", getVideos);

// Admin: Get all videos from all users
router.get("/admin/all", requireRole("admin"), getAllVideosAdmin);

// Get single video (all organization members can view)
router.get("/:id", requireOrganizationAccess, getVideo);

// Stream video (all organization members can view)
router.get("/:id/stream", requireOrganizationAccess, streamVideo);

// Update video (must own or be admin, and be editor/admin role)
router.put("/:id", canModify, updateVideo);

// Delete video (must own or be admin, and be editor/admin role)
router.delete("/:id", canModify, deleteVideo);

export default router;
