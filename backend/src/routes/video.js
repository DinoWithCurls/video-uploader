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
  canModify,
  requireOrganizationAccess,
} from "../middleware/rbac.js";
import upload from "../middleware/upload.js";
import { validateQuery, validateBody, validateParams } from "../middleware/validation.js";
import { videoFiltersSchema, videoUploadSchema, videoUpdateSchema, objectIdSchema } from "../validation/schemas.js";

const router = express.Router();

// All routes require authentication
router.use(auth);

// Upload video (editors and admins only)
router.post(
  "/upload",
  requireRole(["editor", "admin"]),
  upload.single("video"),
  validateBody(videoUploadSchema),
  uploadVideo
);

// Get all videos with filters (all authenticated users)
router.get("/", validateQuery(videoFiltersSchema), getVideos);

// Admin: Get all videos across all organizations
router.get(
  "/admin/all",
  requireRole(["admin"]),
  validateQuery(videoFiltersSchema),
  getAllVideosAdmin
);

// Get single video (all authenticated users)
router.get("/:id", validateParams(objectIdSchema), getVideo);

// Stream video (all authenticated users)
router.get("/:id/stream", validateParams(objectIdSchema), streamVideo);

// Update video metadata (editors and admins only, must be uploader or admin)
router.put(
  "/:id",
  validateParams(objectIdSchema),
  validateBody(videoUpdateSchema),
  requireRole(["editor", "admin"]),
  canModify,
  updateVideo
);

// Delete video (editors and admins only, must be uploader or admin)
router.delete(
  "/:id",
  validateParams(objectIdSchema),
  requireRole(["editor", "admin"]),
  canModify,
  deleteVideo
);

export default router;
