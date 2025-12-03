import api from "./api";
import logger from "../utils/logger";

export interface Organization {
  id: string | number;
  name: string;
  slug: string;
  plan: string;
  limits: {
    maxUsers: number;
    maxStorage: number;
    maxVideos: number;
  };
  settings: {
    allowedDomains?: string[];
    requireEmailVerification?: boolean;
    defaultUserRole?: string;
  };
  memberCount?: number;
  isActive: boolean;
  createdAt: string;
}

export interface OrganizationMember {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

/**
 * Get organization details
 */
export const getOrganization = async (orgId: string): Promise<{ organization: Organization }> => {
  logger.log("[organizationService.getOrganization] Fetching organization:", orgId);
  const response = await api.get(`/organizations/${orgId}`);
  logger.log("[organizationService.getOrganization] Success");
  return response.data;
};

/**
 * Update organization details
 */
export const updateOrganization = async (
  orgId: string,
  data: { name?: string; settings?: any }
): Promise<{ organization: Organization }> => {
  logger.log("[organizationService.updateOrganization] Updating organization:", orgId);
  const response = await api.put(`/organizations/${orgId}`, data);
  logger.log("[organizationService.updateOrganization] Success");
  return response.data;
};

/**
 * Get organization members
 */
export const getOrganizationMembers = async (orgId: string): Promise<{ members: OrganizationMember[] }> => {
  logger.log("[organizationService.getOrganizationMembers] Fetching members:", orgId);
  const response = await api.get(`/organizations/${orgId}/members`);
  logger.log("[organizationService.getOrganizationMembers] Success:", response.data.members.length);
  return response.data;
};

export default {
  getOrganization,
  updateOrganization,
  getOrganizationMembers,
};
