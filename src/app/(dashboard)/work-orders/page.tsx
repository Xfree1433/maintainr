"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { QuickGuide } from "@/components/ui/quick-guide";

const TYPE_BADGES: Record<string, string> = {
  CORRECTIVE: "bg-red-100 text-red-800",
  PREVENTIVE: "bg-blue-100 text-blue-800",
  PREDICTIVE: "bg-purple-100 text-purple-800",
  INSPECTION: "bg-gray-100 text-gray-800",
  EMERGENCY: "bg-red-100 text-red-800",
};

const STATUS_BADGES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  ON_HOLD: "bg-gray-100 text-gray-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const PRIORITY_BADGES: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-gray-100 text-gray-800",
};

interface WorkOrder {
  id: string;
  orderNumber: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  asset: { name: string; assetTag: string } | null;
  technician: { name: string } | null;
}

interface Asset {
  id: string;
  name: string;
  assetTag: string;
}

interface Technician {
  id: string;
  name: string;
}

export default function WorkOrdersPage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "CORRECTIVE",
    priority: "MEDIUM",
    assetId: "",
    technicianId: "",
    estimatedHours: "",
    dueDate: "",
    notes: "",
  });

  const fetchWorkOrders = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (priorityFilter) params.set("priority", priorityFilter);

    const res = await fetch(`/api/work-orders?${params}`);
    if (res.ok) {
      const data = await res.json();
      setWorkOrders(data.workOrders);
    }
    setLoading(false);
  }, [search, statusFilter, typeFilter, priorityFilter]);

  const fetchAssets = useCallback(async () => {
    const res = await fetch("/api/assets");
    if (res.ok) {
      const data = await res.json();
      // /api/assets returns a bare array; tolerate both shapes.
      setAssets(Array.isArray(data) ? data : data.assets ?? []);
    }
  }, []);

  const fetchTechnicians = useCallback(async () => {
    const res = await fetch("/api/technicians");
    if (res.ok) {
      const data = await res.json();
      // /api/technicians returns a bare array; tolerate both shapes.
      setTechnicians(Array.isArray(data) ? data : data.technicians ?? []);
    }
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  useEffect(() => {
    fetchAssets();
    fetchTechnicians();
  }, [fetchAssets, fetchTechnicians]);

  const handleCreate = async () => {
    setCreating(true);
    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description || undefined,
      type: form.type,
      priority: form.priority,
      assetId: form.assetId,
      technicianId: form.technicianId || undefined,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      dueDate: form.dueDate || undefined,
      notes: form.notes || undefined,
    };

    const res = await fetch("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowCreate(false);
      setForm({
        title: "",
        description: "",
        type: "CORRECTIVE",
        priority: "MEDIUM",
        assetId: "",
        technicianId: "",
        estimatedHours: "",
        dueDate: "",
        notes: "",
      });
      fetchWorkOrders();
    }
    setCreating(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Work Orders</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          + New Work Order
        </button>
      </div>

      <QuickGuide
        title="Quick Guide: Work Orders"
        steps={[
          "Create work orders for corrective (breakdown), preventive (scheduled), predictive (sensor-triggered), or emergency maintenance.",
          "Use filters to view work orders by status, type, or priority. Critical/emergency items appear in red.",
          "Click a work order to view full details, track parts used, and mark as complete.",
          "Work orders linked to predictive alerts help track the response to sensor anomalies.",
        ]}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border rounded-lg w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Types</option>
          <option value="CORRECTIVE">Corrective</option>
          <option value="PREVENTIVE">Preventive</option>
          <option value="PREDICTIVE">Predictive</option>
          <option value="INSPECTION">Inspection</option>
          <option value="EMERGENCY">Emergency</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3 font-medium">Order #</th>
              <th className="text-left p-3 font-medium">Title</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Priority</th>
              <th className="text-left p-3 font-medium">Asset</th>
              <th className="text-left p-3 font-medium">Technician</th>
              <th className="text-left p-3 font-medium">Due Date</th>
              <th className="text-left p-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : workOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-500">
                  No work orders found.
                </td>
              </tr>
            ) : (
              workOrders.map((wo) => (
                <tr
                  key={wo.id}
                  onClick={() => router.push(`/work-orders/${wo.id}`)}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                >
                  <td className="p-3 font-mono text-xs">{wo.orderNumber}</td>
                  <td className="p-3">{wo.title}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_BADGES[wo.type] ?? ""}`}
                    >
                      {wo.type}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGES[wo.status] ?? ""}`}
                    >
                      {wo.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_BADGES[wo.priority] ?? ""}`}
                    >
                      {wo.priority}
                    </span>
                  </td>
                  <td className="p-3">{wo.asset?.name ?? "-"}</td>
                  <td className="p-3">{wo.technician?.name ?? "-"}</td>
                  <td className="p-3">
                    {wo.dueDate
                      ? new Date(wo.dueDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="p-3">
                    {new Date(wo.createdAt).toLocaleDateString()}
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
            <h2 className="text-lg font-semibold">Create Work Order</h2>

            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="CORRECTIVE">Corrective</option>
                  <option value="PREVENTIVE">Preventive</option>
                  <option value="PREDICTIVE">Predictive</option>
                  <option value="INSPECTION">Inspection</option>
                  <option value="EMERGENCY">Emergency</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
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

            <div>
              <label className="block text-sm font-medium mb-1">Technician</label>
              <select
                value={form.technicianId}
                onChange={(e) => setForm({ ...form, technicianId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select a technician...</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
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
                disabled={creating || !form.title || !form.assetId}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
