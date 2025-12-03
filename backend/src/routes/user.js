import express from "express";
import { getAllUsers, updateUserRole } from "../controllers/userController.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = express.Router();

// All routes require admin privileges
router.use(auth, requireRole("admin"));

router.get("/", getAllUsers);
router.put("/:id/role", updateUserRole);

export default router;
