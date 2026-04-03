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

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [completeForm, setCompleteForm] = useState({ actualHours: "", notes: "" });
  const [showAddPart, setShowAddPart] = useState(false);
  const [parts, setParts] = useState<Part[]>([]);
  const [partForm, setPartForm] = useState({ partId: "", quantity: "1" });
  const [addingPart, setAddingPart] = useState(false);

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
      setParts(data.parts ?? []);
    }
  }, []);

  useEffect(() => {
    fetchWorkOrder();
    fetchParts();
  }, [fetchWorkOrder, fetchParts]);

  const handleComplete = async () => {
    setCompleting(true);
    const payload: Record<string, unknown> = {};
    if (completeForm.actualHours) payload.actualHours = Number(completeForm.actualHours);
    if (completeForm.notes) payload.notes = completeForm.notes;

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

  const handleAddPart = async () => {
    setAddingPart(true);
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
    }
    setAddingPart(false);
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }

  if (!workOrder) {
    return <div className="p-6 text-gray-500">Work order not found.</div>;
  }

  const canComplete = workOrder.status === "OPEN" || workOrder.status === "IN_PROGRESS";

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
        {canComplete && (
          <button
            onClick={() => setShowComplete(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Complete Work Order
          </button>
        )}
      </div>

      <QuickGuide
        title="Quick Guide: Work Order Details"
        steps={[
          "View the full work order including assigned technician, estimated vs actual hours, and linked asset.",
          "Add parts used during the repair using the 'Add Part' button. Part inventory is automatically decremented.",
          "Click 'Complete Work Order' when finished. This records the completion time and restores the asset to operational status.",
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
          <div className="font-medium">{workOrder.technician?.name ?? "-"}</div>
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
            onClick={() => setShowAddPart(true)}
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
                    {pu.unitCost != null ? `$${pu.unitCost.toFixed(2)}` : "-"}
                  </td>
                  <td className="p-2">
                    {pu.unitCost != null
                      ? `$${(pu.unitCost * pu.quantity).toFixed(2)}`
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
            <div>
              <label className="block text-sm font-medium mb-1">Part *</label>
              <select
                value={partForm.partId}
                onChange={(e) => setPartForm({ ...partForm, partId: e.target.value })}
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
                onChange={(e) => setPartForm({ ...partForm, quantity: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAddPart(false)}
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
    </div>
  );
}
