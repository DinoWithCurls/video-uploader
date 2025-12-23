import express from "express";
import { register, login, getCurrentUser, logout } from "../controllers/authController.js";
import { auth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import{ registerSchema, loginSchema } from "../validation/schemas.js";

const router = express.Router();

// Register - with validation (keeping /signup path for backward compatibility)
router.post("/signup", validateBody(registerSchema), register);

// Login - with validation
router.post("/login", validateBody(loginSchema), login);

// Get current user profile (requires authentication)
router.get("/me", auth, getCurrentUser);

// Logout
router.post("/logout", logout);

export default router;
