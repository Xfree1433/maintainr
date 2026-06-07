"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { QuickGuide } from "@/components/ui/quick-guide";

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

const TYPE_BADGES: Record<string, string> = {
  CORRECTIVE: "bg-red-100 text-red-800",
  PREVENTIVE: "bg-blue-100 text-blue-800",
  PREDICTIVE: "bg-purple-100 text-purple-800",
  INSPECTION: "bg-gray-100 text-gray-800",
  EMERGENCY: "bg-red-100 text-red-800",
};

interface PartUsage {
  id: string;
  quantity: number;
  unitCost: number | null;
  part: { id: string; name: string; partNumber: string };
}

interface WorkOrder {
  id: string;
  orderNumber: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  notes: string | null;
  createdAt: string;
  asset: { id: string; name: string; assetTag: string } | null;
  technician: { id: string; name: string } | null;
  partUsages: PartUsage[];
}

interface Part {
  id: string;
  name: string;
  partNumber: string;
  quantity: number;
}

interface Technician {
  id: string;
  name: string;
}

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    actualHours: "",
    notes: "",
    assetStatus: "OPERATIONAL",
  });
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);
  const [parts, setParts] = useState<Part[]>([]);
  const [partForm, setPartForm] = useState({ partId: "", quantity: "1" });
  const [addingPart, setAddingPart] = useState(false);
  const [addPartError, setAddPartError] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [assignTechId, setAssignTechId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchWorkOrder = useCallback(async () => {
    const res = await fetch(`/api/work-orders/${id}`);
    if (res.ok) {
      const data = await res.json();
      setWorkOrder(data.workOrder);
    }
    setLoading(false);
  }, [id]);

  const fetchParts = useCallback(async () => {
    const res = await fetch("/api/parts");
    if (res.ok) {
      const data = await res.json();
      // /api/parts returns a bare array; tolerate both shapes.
      setParts(Array.isArray(data) ? data : data.parts ?? []);
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
    fetchWorkOrder();
    fetchParts();
    fetchTechnicians();
  }, [fetchWorkOrder, fetchParts, fetchTechnicians]);

  const handleComplete = async () => {
    setCompleting(true);
    const payload: Record<string, unknown> = {};
    if (completeForm.actualHours) payload.actualHours = Number(completeForm.actualHours);
    if (completeForm.notes) payload.notes = completeForm.notes;
    if (completeForm.assetStatus) payload.assetStatus = completeForm.assetStatus;

    const res = await fetch(`/api/work-orders/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowComplete(false);
      fetchWorkOrder();
    }
    setCompleting(false);
  };

  const handleStatusChange = async (status: string) => {
    setUpdatingStatus(true);
    const res = await fetch(`/api/work-orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      fetchWorkOrder();
    }
    setUpdatingStatus(false);
  };

  const handleAddPart = async () => {
    setAddingPart(true);
    setAddPartError(null);
    const res = await fetch(`/api/work-orders/${id}/parts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partId: partForm.partId,
        quantity: Number(partForm.quantity),
      }),
    });

    if (res.ok) {
      setShowAddPart(false);
      setPartForm({ partId: "", quantity: "1" });
      fetchWorkOrder();
      fetchParts();
    } else {
      // Surface the API error (e.g. "Insufficient stock: 3 available, 10
      // requested") instead of silently leaving the dialog open.
      const data = await res.json().catch(() => ({}));
      setAddPartError(
        typeof data.error === "string"
          ? data.error
          : "Could not add part. Check the quantity and try again."
      );
    }
    setAddingPart(false);
  };

  const handleAssignTech = async () => {
    setAssigning(true);
    const res = await fetch(`/api/work-orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technicianId: assignTechId || null }),
    });
    if (res.ok) {
      setShowAssign(false);
      fetchWorkOrder();
    }
    setAssigning(false);
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }

  if (!workOrder) {
    return <div className="p-6 text-gray-500">Work order not found.</div>;
  }

  const status = workOrder.status;
  const isClosed = status === "COMPLETED" || status === "CANCELLED";
  const canComplete = status === "OPEN" || status === "IN_PROGRESS" || status === "ON_HOLD";
  const btn =
    "px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/work-orders")}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
          >
            &larr; Back to Work Orders
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{workOrder.title}</h1>
            <span className="text-sm text-gray-500 font-mono">
              {workOrder.orderNumber}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGES[workOrder.status] ?? ""}`}
            >
              {workOrder.status.replace("_", " ")}
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_BADGES[workOrder.priority] ?? ""}`}
            >
              {workOrder.priority}
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_BADGES[workOrder.type] ?? ""}`}
            >
              {workOrder.type}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status === "OPEN" && (
            <button
              onClick={() => handleStatusChange("IN_PROGRESS")}
              disabled={updatingStatus}
              className={`${btn} bg-blue-600 text-white hover:bg-blue-700`}
            >
              Start Work
            </button>
          )}
          {status === "IN_PROGRESS" && (
            <button
              onClick={() => handleStatusChange("ON_HOLD")}
              disabled={updatingStatus}
              className={`${btn} bg-yellow-500 text-white hover:bg-yellow-600`}
            >
              Put On Hold
            </button>
          )}
          {status === "ON_HOLD" && (
            <button
              onClick={() => handleStatusChange("IN_PROGRESS")}
              disabled={updatingStatus}
              className={`${btn} bg-blue-600 text-white hover:bg-blue-700`}
            >
              Resume Work
            </button>
          )}
          {canComplete && (
            <button
              onClick={() => setShowComplete(true)}
              className={`${btn} bg-green-600 text-white hover:bg-green-700`}
            >
              Complete Work Order
            </button>
          )}
          {!isClosed && (
            <button
              onClick={() => {
                if (confirm("Cancel this work order?")) handleStatusChange("CANCELLED");
              }}
              disabled={updatingStatus}
              className={`${btn} border border-gray-300 text-gray-700 hover:bg-gray-50`}
            >
              Cancel WO
            </button>
          )}
          {isClosed && (
            <button
              onClick={() => handleStatusChange(status === "CANCELLED" ? "OPEN" : "IN_PROGRESS")}
              disabled={updatingStatus}
              className={`${btn} border border-gray-300 text-gray-700 hover:bg-gray-50`}
            >
              Reopen
            </button>
          )}
        </div>
      </div>

      <QuickGuide
        title="Quick Guide: Work Order Details"
        steps={[
          "View the full work order including assigned technician, estimated vs actual hours, and linked asset. Use Assign/Change next to Technician to set or reassign the responsible tech.",
          "Move the order through its lifecycle with Start Work, Put On Hold, Resume, and Cancel. Starting work records the start time.",
          "Add parts used during the repair using the 'Add Part' button. Part inventory is automatically decremented.",
          "Click 'Complete Work Order' when finished. You choose the resulting asset status (defaults to Operational).",
        ]}
      />

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border rounded-lg p-4">
        <div>
          <div className="text-xs text-gray-500">Type</div>
          <div className="font-medium">{workOrder.type}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Asset</div>
          <div className="font-medium">
            {workOrder.asset ? (
              <Link
                href={`/assets/${workOrder.asset.id}`}
                className="text-orange-600 hover:underline"
              >
                {workOrder.asset.name}
              </Link>
            ) : (
              "-"
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Technician</div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{workOrder.technician?.name ?? "-"}</span>
            {!isClosed && (
              <button
                onClick={() => {
                  setAssignTechId(workOrder.technician?.id ?? "");
                  setShowAssign(true);
                }}
                className="text-xs text-orange-600 hover:underline"
              >
                {workOrder.technician ? "Change" : "Assign"}
              </button>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Due Date</div>
          <div className="font-medium">
            {workOrder.dueDate
              ? new Date(workOrder.dueDate).toLocaleDateString()
              : "-"}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Started</div>
          <div className="font-medium">
            {workOrder.startedAt
              ? new Date(workOrder.startedAt).toLocaleString()
              : "-"}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Completed</div>
          <div className="font-medium">
            {workOrder.completedAt
              ? new Date(workOrder.completedAt).toLocaleString()
              : "-"}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Est. Hours</div>
          <div className="font-medium">{workOrder.estimatedHours ?? "-"}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Actual Hours</div>
          <div className="font-medium">{workOrder.actualHours ?? "-"}</div>
        </div>
      </div>

      {/* Description */}
      {workOrder.description && (
        <div className="border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-2">Description</h2>
          <p className="text-sm whitespace-pre-wrap">{workOrder.description}</p>
        </div>
      )}

      {/* Notes */}
      {workOrder.notes && (
        <div className="border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-2">Notes</h2>
          <p className="text-sm whitespace-pre-wrap">{workOrder.notes}</p>
        </div>
      )}

      {/* Parts Used */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500">Parts Used</h2>
          <button
            onClick={() => {
              setAddPartError(null);
              setPartForm({ partId: "", quantity: "1" });
              setShowAddPart(true);
            }}
            className="px-3 py-1 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            + Add Part
          </button>
        </div>
        {workOrder.partUsages.length === 0 ? (
          <p className="text-sm text-gray-400">No parts used yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left p-2 font-medium">Part #</th>
                <th className="text-left p-2 font-medium">Name</th>
                <th className="text-left p-2 font-medium">Quantity</th>
                <th className="text-left p-2 font-medium">Unit Cost</th>
                <th className="text-left p-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {workOrder.partUsages.map((pu) => (
                <tr key={pu.id} className="border-b">
                  <td className="p-2 font-mono text-xs">{pu.part.partNumber}</td>
                  <td className="p-2">{pu.part.name}</td>
                  <td className="p-2">{pu.quantity}</td>
                  <td className="p-2">
                    {pu.unitCost != null
                      ? `$${Number(pu.unitCost).toFixed(2)}`
                      : "-"}
                  </td>
                  <td className="p-2">
                    {pu.unitCost != null
                      ? `$${(Number(pu.unitCost) * pu.quantity).toFixed(2)}`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Complete Dialog */}
      {showComplete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Complete Work Order</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Actual Hours</label>
              <input
                type="number"
                step="0.5"
                value={completeForm.actualHours}
                onChange={(e) =>
                  setCompleteForm({ ...completeForm, actualHours: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={completeForm.notes}
                onChange={(e) =>
                  setCompleteForm({ ...completeForm, notes: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Resulting Asset Status
              </label>
              <select
                value={completeForm.assetStatus}
                onChange={(e) =>
                  setCompleteForm({ ...completeForm, assetStatus: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="OPERATIONAL">Operational</option>
                <option value="DEGRADED">Degraded</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="DOWN">Down</option>
                <option value="DECOMMISSIONED">Decommissioned</option>
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Defaults to Operational. Choose another status if the asset is not
                fully restored.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowComplete(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={completing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {completing ? "Completing..." : "Complete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Part Dialog */}
      {showAddPart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Add Part</h2>
            {addPartError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {addPartError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Part *</label>
              <select
                value={partForm.partId}
                onChange={(e) => {
                  setAddPartError(null);
                  setPartForm({ ...partForm, partId: e.target.value });
                }}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select a part...</option>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.partNumber}) - Qty: {p.quantity}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantity *</label>
              <input
                type="number"
                min="1"
                value={partForm.quantity}
                onChange={(e) => {
                  setAddPartError(null);
                  setPartForm({ ...partForm, quantity: e.target.value });
                }}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowAddPart(false);
                  setAddPartError(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPart}
                disabled={addingPart || !partForm.partId}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {addingPart ? "Adding..." : "Add Part"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Technician Dialog */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Assign Technician</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Technician</label>
              <select
                value={assignTechId}
                onChange={(e) => setAssignTechId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Unassigned</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAssign(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignTech}
                disabled={assigning}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {assigning ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
