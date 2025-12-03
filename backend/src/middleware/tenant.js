/**
 * Tenant Middleware
 * Extracts organization context from authenticated user and attaches to request
 */

export const tenant = async (req, res, next) => {
  try {
    console.log('[Tenant.middleware] Entry:', { userId: req.user?.id, organizationId: req.user?.organizationId });
    
    // Ensure user is authenticated
    if (!req.user) {
      console.log('[Tenant.middleware] No user in request');
      return res.status(401).json({ message: "Authentication required" });
    }

    // Ensure user has organization (unless superadmin)
    if (!req.user.organizationId && req.user.role !== 'superadmin') {
      console.log('[Tenant.middleware] User has no organization:', req.user.id);
      return res.status(400).json({ 
        message: "User not associated with any organization. Please contact support." 
      });
    }

    // Attach organization ID to request for easy access (if exists)
    if (req.user.organizationId) {
      req.organizationId = req.user.organizationId;
    }
    
    console.log('[Tenant.middleware] Organization context set:', { organizationId: req.organizationId });
    next();
  } catch (error) {
    console.error('[Tenant.middleware] Error:', error);
    res.status(500).json({ message: "Error processing organization context" });
  }
};

/**
 * Ensure organization is active
 * Note: This requires populating the organization reference
 */
export const requireActiveOrganization = async (req, res, next) => {
  try {
    const Organization = (await import("../models/Organization.js")).default;
    
    const org = await Organization.findById(req.organizationId);
    
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    if (!org.isActive) {
      return res.status(403).json({ 
        message: "Organization is inactive. Please contact support to reactivate." 
      });
    }

    req.organization = org;
    next();
  } catch (error) {
    console.error('[Tenant.requireActiveOrganization] Error:', error);
    res.status(500).json({ message: "Error validating organization" });
  }
};

export default { tenant, requireActiveOrganization };
