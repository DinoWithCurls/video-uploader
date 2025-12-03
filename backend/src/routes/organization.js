import express from "express";
import {
  getOrganization,
  getAllOrganizations,
  updateOrganization,
  getOrganizationMembers,
  deleteOrganization,
} from "../controllers/organizationController.js";
import { auth } from "../middleware/auth.js";
import { tenant } from "../middleware/tenant.js";

const router = express.Router();

// All organization routes require authentication and tenant context
router.use(auth, tenant);

// Organization management
router.get("/", getAllOrganizations);
router.get("/:id", getOrganization);
router.put("/:id", updateOrganization);
router.get("/:id/members", getOrganizationMembers);
router.delete("/:id", deleteOrganization);

export default router;
