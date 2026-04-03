"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QuickGuide } from "@/components/ui/quick-guide";

interface Part {
  id: string;
  partNumber: string;
  name: string;
  description?: string;
  category?: string;
  quantity: number;
  minStock: number;
  unitCost?: number;
  location?: string;
  supplier?: string;
  leadTimeDays?: number;
}

const emptyForm = {
  partNumber: "",
  name: "",
  description: "",
  category: "",
  quantity: "0",
  minStock: "0",
  unitCost: "",
  location: "",
  supplier: "",
  leadTimeDays: "",
};

export default function PartsPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Derive unique categories from parts
  const categories = Array.from(new Set(parts.map((p) => p.category).filter(Boolean))) as string[];

  const fetchParts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryFilter) params.set("category", categoryFilter);
    const res = await fetch(`/api/parts?${params}`);
    if (res.ok) {
      setParts(await res.json());
    }
    setLoading(false);
  }, [search, categoryFilter]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((part: Part) => {
    setEditing(part);
    setForm({
      partNumber: part.partNumber,
      name: part.name,
      description: part.description ?? "",
      category: part.category ?? "",
      quantity: String(part.quantity),
      minStock: String(part.minStock),
      unitCost: part.unitCost != null ? String(part.unitCost) : "",
      location: part.location ?? "",
      supplier: part.supplier ?? "",
      leadTimeDays: part.leadTimeDays != null ? String(part.leadTimeDays) : "",
    });
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const payload: Record<string, unknown> = {
      partNumber: form.partNumber,
      name: form.name,
      quantity: Number(form.quantity),
      minStock: Number(form.minStock),
    };
    if (form.description) payload.description = form.description;
    if (form.category) payload.category = form.category;
    if (form.unitCost) payload.unitCost = Number(form.unitCost);
    if (form.location) payload.location = form.location;
    if (form.supplier) payload.supplier = form.supplier;
    if (form.leadTimeDays) payload.leadTimeDays = Number(form.leadTimeDays);

    const url = editing ? `/api/parts/${editing.id}` : "/api/parts";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setDialogOpen(false);
      fetchParts();
    }
    setSaving(false);
  }, [form, editing, fetchParts]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this part?")) return;
      const res = await fetch(`/api/parts/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchParts();
      }
    },
    [fetchParts]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Parts Inventory</h1>
        <Button onClick={openCreate}>Add Part</Button>
      </div>

      <QuickGuide
        title="Quick Guide: Spare Parts"
        steps={[
          "Track spare parts inventory with part numbers, quantities, minimum stock levels, and costs.",
          "Rows highlighted in red indicate low stock — quantity has fallen below the minimum threshold.",
          "Parts are automatically decremented when added to work orders, keeping inventory accurate.",
          "Set up suppliers and lead times to plan reorders before stockouts occur.",
        ]}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search parts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {["Part Number", "Name", "Category", "Quantity", "Min Stock", "Unit Cost", "Supplier", "Actions"].map(
                (h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : parts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No parts found.</td>
              </tr>
            ) : (
              parts.map((part) => {
                const lowStock = part.quantity < part.minStock;
                return (
                  <tr
                    key={part.id}
                    className={
                      lowStock
                        ? "bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800"
                    }
                  >
                    <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                      {part.partNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{part.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{part.category ?? "\u2014"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      <span className={lowStock ? "text-red-600 dark:text-red-400 font-semibold" : ""}>
                        {part.quantity}
                      </span>
                      {lowStock && (
                        <span className="ml-2 inline-flex items-center rounded-md bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                          LOW
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{part.minStock}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {part.unitCost != null ? `$${Number(part.unitCost).toFixed(2)}` : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{part.supplier ?? "\u2014"}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          className="text-orange-600 hover:text-orange-800 dark:hover:text-orange-400 text-sm font-medium"
                          onClick={() => openEdit(part)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800 dark:hover:text-red-400 text-sm font-medium"
                          onClick={() => handleDelete(part.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Part" : "Create Part"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Part Number *</Label>
                <Input
                  value={form.partNumber}
                  onChange={(e) => setForm({ ...form, partNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Min Stock</Label>
                <Input
                  type="number"
                  value={form.minStock}
                  onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.unitCost}
                  onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Lead Time (days)</Label>
                <Input
                  type="number"
                  value={form.leadTimeDays}
                  onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
