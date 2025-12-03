import { useState } from "react";
import { useOrganization } from "../../contexts/OrganizationContext";
import logger from "../../utils/logger";

const OrganizationSettings = () => {
  const { organization, loading, error, updateOrganization } = useOrganization();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: organization?.name || "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">Loading organization...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">No organization found</div>
      </div>
    );
  }

  const handleEdit = () => {
    setFormData({ name: organization.name });
    setEditing(true);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({ name: organization.name });
    setSaveError(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);
      
      logger.log("[OrganizationSettings] Saving changes:", formData);
      await updateOrganization({ name: formData.name });
      
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      logger.log("[OrganizationSettings] Changes saved");
    } catch (err: any) {
      logger.error("[OrganizationSettings] Save error:", err);
      setSaveError(err.response?.data?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Organization Settings</h1>

      {saveSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Changes saved successfully!
        </div>
      )}

      {saveError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {saveError}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">General Information</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name
            </label>
            {editing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Organization name"
              />
            ) : (
              <p className="text-gray-900">{organization.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug
            </label>
            <p className="text-gray-500">{organization.slug}</p>
            <p className="text-xs text-gray-400 mt-1">
              This is your organization's unique identifier
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan
            </label>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {organization.plan}
            </span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Edit Information
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Usage & Limits</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-700">Members</span>
            <span className="text-gray-900">
              {organization.memberCount || 0} / {organization.limits.maxUsers}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Storage</span>
            <span className="text-gray-900">
              {((organization.limits.maxStorage) / (1024 * 1024 * 1024)).toFixed(2)} GB
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Videos</span>
            <span className="text-gray-900">
              {organization.limits.maxVideos} max
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettings;
