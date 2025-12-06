import Organization from "../models/Organization.js";
import User from "../models/User.js";

/**
 * Get all organizations (Admin only)
 * GET /api/organizations
 */
export const getAllOrganizations = async (req, res) => {
  try {
    console.log('[OrganizationController.getAllOrganizations] Entry:', { userId: req.user.id });
    
    // Only admin can view all organizations (or maybe we want to restrict this further?)
    // For now, let's assume this endpoint is for system admins which we might not have yet,
    // or we can just leave it protected by auth but remove the specific 'superadmin' string check.
    // If we want to restrict it to 'admin' role of *some* org, that's different.
    // Given the prompt, I will just remove the explicit check for 'superadmin'.
    
    // If this was strictly for superadmin, maybe we should remove the endpoint or restrict to admin?
    // Let's restrict to 'admin' for now as a safe fallback if it's used.
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied: Admin only" });
    }

    const organizations = await Organization.find()
      .select('name slug plan isActive createdAt owner')
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });

    // Get stats for each org
    const orgsWithStats = await Promise.all(organizations.map(async (org) => {
      const memberCount = await User.countDocuments({ organizationId: org._id });
      // We need to dynamically import Video model to avoid circular dependencies if any
      const Video = (await import("../models/Video.js")).default;
      const videoCount = await Video.countDocuments({ organizationId: org._id });
      
      return {
        ...org.toObject(),
        memberCount,
        videoCount
      };
    }));
    
    console.log('[OrganizationController.getAllOrganizations] Success:', { count: orgsWithStats.length });
    res.json({ organizations: orgsWithStats });
  } catch (error) {
    console.error("[OrganizationController.getAllOrganizations] Error:", error);
    res.status(500).json({ message: "Error fetching organizations" });
  }
};

/**
 * Get organization details
 * GET /api/organizations/:id
 */
export const getOrganization = async (req, res) => {
  try {
    console.log('[OrganizationController.getOrganization] Entry:', { orgId: req.params.id, userId: req.user.id });
    
    const org = await Organization.findById(req.params.id).populate('owner', 'name email');
    
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Only members of the organization can view it
    if (req.user.organizationId.toString() !== org._id.toString()) {
      console.log('[OrganizationController.getOrganization] Access denied');
      return res.status(403).json({ message: "Access denied" });
    }

    // Get member count
    const memberCount = await User.countDocuments({ organizationId: org._id });
    
    console.log('[OrganizationController.getOrganization] Success');
    res.json({
      organization: {
        id: org._id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        limits: org.limits,
        settings: org.settings,
        owner: org.owner,
        memberCount,
        isActive: org.isActive,
        createdAt: org.createdAt,
      },
    });
  } catch (error) {
    console.error("[OrganizationController.getOrganization] Error:", error);
    res.status(500).json({ message: "Error fetching organization" });
  }
};

/**
 * Update organization details
 * PUT /api/organizations/:id
 */
export const updateOrganization = async (req, res) => {
  try {
    console.log('[OrganizationController.updateOrganization] Entry:', { orgId: req.params.id, updates: Object.keys(req.body) });
    
    const org = await Organization.findById(req.params.id);
    
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Only organization members can update
    if (req.user.organizationId.toString() !== org._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Only owner or admin can update organization
    if (!org.isOwner(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Only organization owner or admin can update organization" });
    }

    const { name, settings } = req.body;

    if (name) org.name = name;
    if (settings) org.settings = { ...org.settings, ...settings };

    await org.save();
    
    console.log('[OrganizationController.updateOrganization] Success');
    res.json({
      message: "Organization updated successfully",
      organization: {
        id: org._id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        limits: org.limits,
        settings: org.settings,
      },
    });
  } catch (error) {
    console.error("[OrganizationController.updateOrganization] Error:", error);
    res.status(500).json({ message: "Error updating organization" });
  }
};

/**
 * Get organization members
 * GET /api/organizations/:id/members
 */
export const getOrganizationMembers = async (req, res) => {
  try {
    console.log('[OrganizationController.getOrganizationMembers] Entry:', { orgId: req.params.id });
    
    const org = await Organization.findById(req.params.id);
    
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Only organization members can view members
    if (req.user.organizationId.toString() !== org._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    const members = await User.find({ organizationId: org._id })
      .select('-password')
      .sort({ createdAt: -1 });
    
    console.log('[OrganizationController.getOrganizationMembers] Success:', { count: members.length });
    res.json({ members });
  } catch (error) {
    console.error("[OrganizationController.getOrganizationMembers] Error:", error);
    res.status(500).json({ message: "Error fetching members" });
  }
};

/**
 * Delete organization (owner only)
 * DELETE /api/organizations/:id
 */
export const deleteOrganization = async (req, res) => {
  try {
    console.log('[OrganizationController.deleteOrganization] Entry:', { orgId: req.params.id, userId: req.user.id });
    
    const org = await Organization.findById(req.params.id);
    
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Only owner can delete
    if (!org.isOwner(req.user.id)) {
      return res.status(403).json({ message: "Only organization owner can delete organization" });
    }

    // Check if there are other members
    const memberCount = await User.countDocuments({ organizationId: org._id });
    if (memberCount > 1) {
      return res.status(400).json({ 
        message: "Cannot delete organization with multiple members. Please remove all users first." 
      });
    }

    await org.deleteOne();
    
    console.log('[OrganizationController.deleteOrganization] Success');
    res.json({ message: "Organization deleted successfully" });
  } catch (error) {
    console.error("[OrganizationController.deleteOrganization] Error:", error);
    res.status(500).json({ message: "Error deleting organization" });
  }
};
