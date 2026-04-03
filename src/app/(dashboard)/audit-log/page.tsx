"use client";

import { useState, useEffect, useCallback } from "react";
import { QuickGuide } from "@/components/ui/quick-guide";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: string | null;
  createdAt: string;
  user: { name: string | null } | null;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [skip, setSkip] = useState(0);
  const take = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (entityTypeFilter) params.set("entityType", entityTypeFilter);
    if (actionFilter) params.set("action", actionFilter);
    params.set("take", String(take));
    params.set("skip", String(skip));

    const res = await fetch(`/api/audit-log?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    }
    setLoading(false);
  }, [entityTypeFilter, actionFilter, skip]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setSkip(0);
  }, [entityTypeFilter, actionFilter]);

  const truncateMetadata = (metadata: string | null) => {
    if (!metadata) return "-";
    const str = metadata.length > 80 ? metadata.slice(0, 80) + "..." : metadata;
    return str;
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>

      <QuickGuide
        title="Quick Guide: Audit Trail"
        steps={[
          "Every create, update, and delete action is logged with timestamp, user, and entity details.",
          "Filter by entity type (Asset, WorkOrder, Connector, etc.) or action to find specific changes.",
          "Metadata column shows additional context like what fields changed or what triggered the action.",
        ]}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Entity Types</option>
          <option value="Asset">Asset</option>
          <option value="MaintenanceWorkOrder">Work Order</option>
          <option value="Part">Part</option>
          <option value="Technician">Technician</option>
          <option value="MaintenanceSchedule">Schedule</option>
          <option value="PredictiveAlert">Predictive Alert</option>
          <option value="DowntimeEvent">Downtime</option>
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Actions</option>
          <option value="asset.create">Asset Created</option>
          <option value="asset.update">Asset Updated</option>
          <option value="asset.delete">Asset Deleted</option>
          <option value="workorder.create">WO Created</option>
          <option value="workorder.update">WO Updated</option>
          <option value="workorder.complete">WO Completed</option>
          <option value="downtime.create">Downtime Created</option>
          <option value="downtime.end">Downtime Ended</option>
          <option value="predictive_alert.update">Alert Updated</option>
        </select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3 font-medium">Timestamp</th>
              <th className="text-left p-3 font-medium">Action</th>
              <th className="text-left p-3 font-medium">Entity Type</th>
              <th className="text-left p-3 font-medium">Entity ID</th>
              <th className="text-left p-3 font-medium">User</th>
              <th className="text-left p-3 font-medium">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3">{log.entityType}</td>
                  <td className="p-3 font-mono text-xs">
                    {log.entityId ? log.entityId.slice(0, 12) + "..." : "-"}
                  </td>
                  <td className="p-3">{log.user?.name ?? "System"}</td>
                  <td className="p-3 text-xs text-gray-500 max-w-[200px] truncate">
                    {truncateMetadata(log.metadata)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > take && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {skip + 1}-{Math.min(skip + take, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setSkip(Math.max(0, skip - take))}
              disabled={skip === 0}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setSkip(skip + take)}
              disabled={skip + take >= total}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
