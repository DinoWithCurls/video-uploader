import express from "express";
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody, validateParams } from "../middleware/validation.js";
import { createCategorySchema, updateCategorySchema, objectIdSchema } from "../validation/schemas.js";

const router = express.Router();

// All routes require authentication
router.use(auth);

// Get all categories (all authenticated users)
router.get("/", getCategories);

// Create category (editors and admins only)
router.post(
  "/",
  requireRole(["editor", "admin"]),
  validateBody(createCategorySchema),
  createCategory
);

// Update category (editors and admins only)
router.put(
  "/:id",
  requireRole(["editor", "admin"]),
  validateParams(objectIdSchema),
  validateBody(updateCategorySchema),
  updateCategory
);

// Delete category (editors and admins only)
router.delete(
  "/:id",
  requireRole(["editor", "admin"]),
  validateParams(objectIdSchema),
  deleteCategory
);

export default router;
