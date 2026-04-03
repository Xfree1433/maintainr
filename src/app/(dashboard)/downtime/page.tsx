"use client";

import { useState, useEffect, useCallback } from "react";
import { QuickGuide } from "@/components/ui/quick-guide";

const REASON_BADGES: Record<string, string> = {
  BREAKDOWN: "bg-red-100 text-red-800",
  PREVENTIVE_MAINTENANCE: "bg-blue-100 text-blue-800",
  SETUP_CHANGEOVER: "bg-purple-100 text-purple-800",
  MATERIAL_SHORTAGE: "bg-yellow-100 text-yellow-800",
  OPERATOR_UNAVAILABLE: "bg-orange-100 text-orange-800",
  QUALITY_ISSUE: "bg-pink-100 text-pink-800",
  EXTERNAL: "bg-gray-100 text-gray-800",
  OTHER: "bg-gray-100 text-gray-800",
};

interface DowntimeEvent {
  id: string;
  reason: string;
  category: string | null;
  notes: string | null;
  planned: boolean;
  startedAt: string;
  endedAt: string | null;
  durationMin: number | null;
  asset: { name: string; assetTag: string };
}

interface Asset {
  id: string;
  name: string;
  assetTag: string;
}

export default function DowntimePage() {
  const [events, setEvents] = useState<DowntimeEvent[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    assetId: "",
    reason: "BREAKDOWN",
    category: "",
    notes: "",
    planned: false,
    startedAt: new Date().toISOString().slice(0, 16),
  });

  const fetchEvents = useCallback(async () => {
    const res = await fetch("/api/downtime");
    if (res.ok) {
      const data = await res.json();
      setEvents(data);
    }
    setLoading(false);
  }, []);

  const fetchAssets = useCallback(async () => {
    const res = await fetch("/api/assets");
    if (res.ok) {
      const data = await res.json();
      setAssets(data.assets ?? data);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchAssets();
  }, [fetchEvents, fetchAssets]);

  const handleCreate = async () => {
    setCreating(true);
    const res = await fetch("/api/downtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: form.assetId,
        reason: form.reason,
        category: form.category || undefined,
        notes: form.notes || undefined,
        planned: form.planned,
        startedAt: new Date(form.startedAt).toISOString(),
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      setForm({
        assetId: "",
        reason: "BREAKDOWN",
        category: "",
        notes: "",
        planned: false,
        startedAt: new Date().toISOString().slice(0, 16),
      });
      fetchEvents();
    }
    setCreating(false);
  };

  const handleEnd = async (id: string) => {
    setEndingId(id);
    const res = await fetch(`/api/downtime/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endedAt: new Date().toISOString() }),
    });
    if (res.ok) {
      fetchEvents();
    }
    setEndingId(null);
  };

  const formatDuration = (min: number | null, startedAt: string, endedAt: string | null) => {
    if (min != null) {
      if (min < 60) return `${min}m`;
      return `${Math.floor(min / 60)}h ${min % 60}m`;
    }
    if (!endedAt) {
      const elapsed = Math.round(
        (Date.now() - new Date(startedAt).getTime()) / (1000 * 60)
      );
      if (elapsed < 60) return `${elapsed}m (ongoing)`;
      return `${Math.floor(elapsed / 60)}h ${elapsed % 60}m (ongoing)`;
    }
    return "-";
  };

  // Summary stats
  const totalEvents = events.length;
  const completedEvents = events.filter((e) => e.durationMin != null);
  const avgDuration =
    completedEvents.length > 0
      ? Math.round(
          completedEvents.reduce((sum, e) => sum + (e.durationMin ?? 0), 0) /
            completedEvents.length
        )
      : 0;
  const plannedCount = events.filter((e) => e.planned).length;
  const unplannedCount = events.filter((e) => !e.planned).length;

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Downtime Tracking</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          + Log Downtime
        </button>
      </div>

      <QuickGuide
        title="Quick Guide: Downtime Tracking"
        steps={[
          "Log equipment downtime events with reason, category, and whether they were planned or unplanned.",
          "End active downtime events using the 'End' button — duration is automatically calculated.",
          "Summary stats at the top show total events, average duration, and planned vs unplanned breakdown.",
          "Downtime data feeds into MTBF/MTTR calculations on the Reports page.",
        ]}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-sm text-gray-500">Total Events</p>
          <p className="text-2xl font-bold">{totalEvents}</p>
        </div>
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-sm text-gray-500">Avg Duration</p>
          <p className="text-2xl font-bold">
            {avgDuration < 60
              ? `${avgDuration}m`
              : `${Math.floor(avgDuration / 60)}h ${avgDuration % 60}m`}
          </p>
        </div>
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-sm text-gray-500">Planned</p>
          <p className="text-2xl font-bold text-blue-600">{plannedCount}</p>
        </div>
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-sm text-gray-500">Unplanned</p>
          <p className="text-2xl font-bold text-red-600">{unplannedCount}</p>
        </div>
      </div>

      {/* Downtime Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3 font-medium">Asset</th>
              <th className="text-left p-3 font-medium">Reason</th>
              <th className="text-left p-3 font-medium">Category</th>
              <th className="text-left p-3 font-medium">Planned?</th>
              <th className="text-left p-3 font-medium">Started</th>
              <th className="text-left p-3 font-medium">Ended</th>
              <th className="text-left p-3 font-medium">Duration</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500">
                  No downtime events found.
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    {ev.asset.name}{" "}
                    <span className="text-xs text-gray-500">({ev.asset.assetTag})</span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${REASON_BADGES[ev.reason] ?? ""}`}
                    >
                      {ev.reason.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="p-3">{ev.category ?? "-"}</td>
                  <td className="p-3">
                    {ev.planned ? (
                      <span className="text-blue-600 font-medium">Yes</span>
                    ) : (
                      <span className="text-red-600 font-medium">No</span>
                    )}
                  </td>
                  <td className="p-3">
                    {new Date(ev.startedAt).toLocaleString()}
                  </td>
                  <td className="p-3">
                    {ev.endedAt
                      ? new Date(ev.endedAt).toLocaleString()
                      : "-"}
                  </td>
                  <td className="p-3">
                    {formatDuration(ev.durationMin, ev.startedAt, ev.endedAt)}
                  </td>
                  <td className="p-3">
                    {!ev.endedAt && (
                      <button
                        onClick={() => handleEnd(ev.id)}
                        disabled={endingId === ev.id}
                        className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                      >
                        {endingId === ev.id ? "Ending..." : "End Downtime"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4">
            <h2 className="text-lg font-semibold">Log Downtime Event</h2>

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

            <div>
              <label className="block text-sm font-medium mb-1">Reason *</label>
              <select
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="BREAKDOWN">Breakdown</option>
                <option value="PREVENTIVE_MAINTENANCE">Preventive Maintenance</option>
                <option value="SETUP_CHANGEOVER">Setup / Changeover</option>
                <option value="MATERIAL_SHORTAGE">Material Shortage</option>
                <option value="OPERATOR_UNAVAILABLE">Operator Unavailable</option>
                <option value="QUALITY_ISSUE">Quality Issue</option>
                <option value="EXTERNAL">External</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g. Mechanical, Electrical..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Started At *</label>
              <input
                type="datetime-local"
                value={form.startedAt}
                onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="planned"
                checked={form.planned}
                onChange={(e) => setForm({ ...form, planned: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="planned" className="text-sm font-medium">
                Planned downtime
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.assetId}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {creating ? "Logging..." : "Log Downtime"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
