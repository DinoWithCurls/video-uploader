import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import organizationService, { type Organization } from "../services/organizationService";
import logger from "../utils/logger";

interface OrganizationContextType {
  organization: Organization | null;
  loading: boolean;
  error: string | null;
  refreshOrganization: () => Promise<void>;
  updateOrganization: (data: { name?: string; settings?: any }) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = async () => {
    if (!user?.organizationId) {
      logger.log("[OrganizationContext] No organizationId, skipping fetch");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      logger.log("[OrganizationContext] Fetching organization:", user.organizationId);
      
      const { organization: org } = await organizationService.getOrganization(
        String(user.organizationId)
      );
      
      setOrganization(org);
      logger.log("[OrganizationContext] Organization fetched:", org.name);
    } catch (err: any) {
      logger.error("[OrganizationContext] Error fetching organization:", err);
      setError(err.response?.data?.message || "Failed to load organization");
    } finally {
      setLoading(false);
    }
  };

  const updateOrg = async (data: { name?: string; settings?: any }) => {
    if (!user?.organizationId) return;

    try {
      setLoading(true);
      setError(null);
      logger.log("[OrganizationContext] Updating organization");
      
      const { organization: updated } = await organizationService.updateOrganization(
        String(user.organizationId),
        data
      );
      
      setOrganization(updated);
      logger.log("[OrganizationContext] Organization updated");
    } catch (err: any) {
      logger.error("[OrganizationContext] Error updating organization:", err);
      setError(err.response?.data?.message || "Failed to update organization");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.organizationId) {
      fetchOrganization();
    } else {
      setOrganization(null);
    }
  }, [user?.organizationId]);

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        loading,
        error,
        refreshOrganization: fetchOrganization,
        updateOrganization: updateOrg,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return context;
};

export default OrganizationContext;
