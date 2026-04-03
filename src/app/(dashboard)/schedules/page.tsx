"use client";

import { useState, useEffect, useCallback } from "react";
import { QuickGuide } from "@/components/ui/quick-guide";

interface Schedule {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  intervalDays: number;
  nextDue: string;
  lastPerformed: string | null;
  estimatedHours: number | null;
  enabled: boolean;
  checklist: string | null;
  assetId: string;
  asset: { name: string; assetTag: string } | null;
}

interface Asset {
  id: string;
  name: string;
  assetTag: string;
}

const FREQUENCIES = [
  "DAILY",
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUAL",
  "ANNUAL",
  "CUSTOM",
];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assetFilter, setAssetFilter] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    name: "",
    description: "",
    assetId: "",
    frequency: "MONTHLY",
    intervalDays: "30",
    nextDue: "",
    estimatedHours: "",
    checklist: "",
  };
  const [form, setForm] = useState(emptyForm);

  const fetchSchedules = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (assetFilter) params.set("assetId", assetFilter);

    const res = await fetch(`/api/schedules?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSchedules(data.schedules);
    }
    setLoading(false);
  }, [search, assetFilter]);

  const fetchAssets = useCallback(async () => {
    const res = await fetch("/api/assets");
    if (res.ok) {
      const data = await res.json();
      setAssets(data.assets ?? []);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (s: Schedule) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      description: s.description ?? "",
      assetId: s.assetId,
      frequency: s.frequency,
      intervalDays: String(s.intervalDays),
      nextDue: s.nextDue ? new Date(s.nextDue).toISOString().split("T")[0] : "",
      estimatedHours: s.estimatedHours != null ? String(s.estimatedHours) : "",
      checklist: s.checklist ?? "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: form.name,
      description: form.description || undefined,
      assetId: form.assetId,
      frequency: form.frequency,
      intervalDays: Number(form.intervalDays),
      nextDue: form.nextDue,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      checklist: form.checklist || undefined,
    };

    const url = editingId ? `/api/schedules/${editingId}` : "/api/schedules";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowDialog(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchSchedules();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this schedule?")) return;
    const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    if (res.ok) fetchSchedules();
  };

  const handleToggleEnabled = async (s: Schedule) => {
    await fetch(`/api/schedules/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !s.enabled }),
    });
    fetchSchedules();
  };

  const isOverdue = (nextDue: string) => new Date(nextDue) < new Date();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Maintenance Schedules</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          + New Schedule
        </button>
      </div>

      <QuickGuide
        title="Quick Guide: Maintenance Schedules"
        steps={[
          "Create preventive maintenance schedules to automatically track when equipment needs servicing.",
          "Rows highlighted in red are overdue — their next due date has passed.",
          "Set frequency (daily, weekly, monthly, quarterly, etc.) and the system tracks next due dates.",
          "Optionally add a checklist of tasks for technicians to follow during scheduled maintenance.",
        ]}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search schedules..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border rounded-lg w-64"
        />
        <select
          value={assetFilter}
          onChange={(e) => setAssetFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Assets</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.assetTag})
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Asset</th>
              <th className="text-left p-3 font-medium">Frequency</th>
              <th className="text-left p-3 font-medium">Interval (days)</th>
              <th className="text-left p-3 font-medium">Next Due</th>
              <th className="text-left p-3 font-medium">Last Performed</th>
              <th className="text-left p-3 font-medium">Enabled</th>
              <th className="text-left p-3 font-medium">Est. Hours</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : schedules.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-500">
                  No schedules found.
                </td>
              </tr>
            ) : (
              schedules.map((s) => (
                <tr
                  key={s.id}
                  className={`border-b ${
                    isOverdue(s.nextDue) ? "bg-red-50" : "hover:bg-gray-50"
                  }`}
                >
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3">{s.asset?.name ?? "-"}</td>
                  <td className="p-3">{s.frequency.replace("_", " ")}</td>
                  <td className="p-3">{s.intervalDays}</td>
                  <td className="p-3">
                    <span className={isOverdue(s.nextDue) ? "text-red-600 font-medium" : ""}>
                      {new Date(s.nextDue).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="p-3">
                    {s.lastPerformed
                      ? new Date(s.lastPerformed).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleToggleEnabled(s)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${
                        s.enabled ? "bg-orange-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          s.enabled ? "left-5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="p-3">{s.estimatedHours ?? "-"}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-orange-600 hover:underline text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4">
            <h2 className="text-lg font-semibold">
              {editingId ? "Edit Schedule" : "Create Schedule"}
            </h2>

            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Asset *</label>
              <select
                value={form.assetId}
                onChange={(e) => setForm({ ...form, assetId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select an asset...</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.assetTag})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Frequency *</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {f.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Interval (days) *</label>
                <input
                  type="number"
                  min="1"
                  value={form.intervalDays}
                  onChange={(e) => setForm({ ...form, intervalDays: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Next Due *</label>
                <input
                  type="date"
                  value={form.nextDue}
                  onChange={(e) => setForm({ ...form, nextDue: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Est. Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.estimatedHours}
                  onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Checklist</label>
              <textarea
                value={form.checklist}
                onChange={(e) => setForm({ ...form, checklist: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={4}
                placeholder="Enter checklist items, one per line..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDialog(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.assetId || !form.nextDue}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
