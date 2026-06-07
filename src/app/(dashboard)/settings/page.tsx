"use client";

import { useState, useEffect, useCallback } from "react";
import { QuickGuide } from "@/components/ui/quick-guide";

interface Profile {
  user: { id: string; name: string | null; email: string; image: string | null };
  role: string | null;
  organization: { id: string; name: string; slug: string; plan: string } | null;
}

interface Member {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string; image: string | null };
}

const ROLE_BADGES: Record<string, string> = {
  OWNER: "bg-orange-100 text-orange-800",
  ADMIN: "bg-purple-100 text-purple-800",
  MANAGER: "bg-blue-100 text-blue-800",
  OPERATOR: "bg-green-100 text-green-800",
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", organizationName: "" });

  const fetchProfile = useCallback(async () => {
    const res = await fetch("/api/profile");
    if (res.ok) {
      setProfile(await res.json());
    }
  }, []);

  const canEditOrg = profile?.role === "OWNER" || profile?.role === "ADMIN";

  const startEdit = () => {
    setForm({
      name: profile?.user.name ?? "",
      organizationName: profile?.organization?.name ?? "",
    });
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {};
    if (form.name && form.name !== profile?.user.name) payload.name = form.name;
    if (
      canEditOrg &&
      form.organizationName &&
      form.organizationName !== profile?.organization?.name
    ) {
      payload.organizationName = form.organizationName;
    }

    if (Object.keys(payload).length === 0) {
      setEditing(false);
      setSaving(false);
      return;
    }

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setProfile(await res.json());
      setEditing(false);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error?.formErrors?.[0] ?? data.error ?? "Failed to save changes.");
    }
    setSaving(false);
  };

  const fetchTeam = useCallback(async () => {
    const res = await fetch("/api/team");
    if (res.ok) {
      setMembers(await res.json());
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchProfile(), fetchTeam()]).then(() => setLoading(false));
  }, [fetchProfile, fetchTeam]);

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <QuickGuide
        title="Quick Guide: Settings"
        steps={[
          "Click Edit in the Profile section to update your display name. Owners and admins can also rename the organization.",
          "The Team section shows all members of your organization with their roles.",
          "Organization roles: Owner has full access, Admin manages settings, Manager oversees operations, Operator handles day-to-day tasks.",
        ]}
      />

      {/* Profile Section */}
      <section className="border rounded-lg p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Profile</h2>
          {profile && !editing && (
            <button
              onClick={startEdit}
              className="px-3 py-1.5 text-sm border border-orange-600 text-orange-700 rounded-lg hover:bg-orange-50"
            >
              Edit
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {!profile ? (
          <p className="text-gray-500">Unable to load profile.</p>
        ) : editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Email</label>
                <input
                  type="text"
                  value={profile.user.email}
                  disabled
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Organization
                </label>
                <input
                  type="text"
                  value={form.organizationName}
                  onChange={(e) =>
                    setForm({ ...form, organizationName: e.target.value })
                  }
                  disabled={!canEditOrg}
                  className={`w-full px-3 py-2 border rounded-lg ${canEditOrg ? "" : "bg-gray-50 text-gray-500"}`}
                />
                {!canEditOrg && (
                  <p className="mt-1 text-xs text-gray-400">
                    Only an owner or admin can rename the organization.
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{profile.user.name ?? "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{profile.user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_BADGES[profile.role ?? ""] ?? "bg-gray-100 text-gray-800"}`}
              >
                {profile.role ?? "-"}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Organization</p>
              <p className="font-medium">
                {profile.organization?.name ?? "-"}{" "}
                {profile.organization?.plan && (
                  <span className="text-xs text-gray-400">
                    ({profile.organization.plan})
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Team Section */}
      <section className="border rounded-lg p-6 bg-white">
        <h2 className="text-lg font-semibold mb-4">Team</h2>
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-gray-500">
                    No team members found.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{m.user.name ?? "-"}</td>
                    <td className="p-3">{m.user.email}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_BADGES[m.role] ?? "bg-gray-100 text-gray-800"}`}
                      >
                        {m.role}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
