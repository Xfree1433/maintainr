"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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

interface Category {
  id: string;
  name: string;
}

interface Asset {
  id: string;
  assetTag: string;
  name: string;
  description?: string;
  status: string;
  criticality: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installDate?: string;
  location?: string;
  categoryId?: string;
  category?: Category | null;
}

const STATUS_OPTIONS = ["OPERATIONAL", "DEGRADED", "DOWN", "MAINTENANCE", "DECOMMISSIONED"];
const CRITICALITY_OPTIONS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const STATUS_BADGE: Record<string, string> = {
  OPERATIONAL: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  DEGRADED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  DOWN: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  MAINTENANCE: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  DECOMMISSIONED: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const CRITICALITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  LOW: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const emptyForm = {
  assetTag: "",
  name: "",
  description: "",
  status: "OPERATIONAL",
  criticality: "MEDIUM",
  manufacturer: "",
  model: "",
  serialNumber: "",
  installDate: "",
  location: "",
  categoryId: "",
};

export default function AssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("categoryId", categoryFilter);
    const res = await fetch(`/api/assets?${params}`);
    if (res.ok) {
      setAssets(await res.json());
    }
    setLoading(false);
  }, [search, statusFilter, categoryFilter]);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/asset-categories");
    if (res.ok) {
      setCategories(await res.json());
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((asset: Asset) => {
    setEditing(asset);
    setForm({
      assetTag: asset.assetTag,
      name: asset.name,
      description: asset.description ?? "",
      status: asset.status,
      criticality: asset.criticality,
      manufacturer: asset.manufacturer ?? "",
      model: asset.model ?? "",
      serialNumber: asset.serialNumber ?? "",
      installDate: asset.installDate ? asset.installDate.slice(0, 10) : "",
      location: asset.location ?? "",
      categoryId: asset.categoryId ?? "",
    });
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const payload: Record<string, unknown> = { ...form };
    if (!payload.categoryId) delete payload.categoryId;
    if (!payload.installDate) delete payload.installDate;
    if (!payload.description) delete payload.description;

    const url = editing ? `/api/assets/${editing.id}` : "/api/assets";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setDialogOpen(false);
      fetchAssets();
    }
    setSaving(false);
  }, [form, editing, fetchAssets]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this asset?")) return;
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchAssets();
      }
    },
    [fetchAssets]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Assets</h1>
        <Button onClick={openCreate}>Add Asset</Button>
      </div>

      <QuickGuide
        title="Quick Guide: Assets"
        steps={[
          "Add new equipment using the 'Add Asset' button. Each asset needs a unique tag (e.g., CNC-001).",
          "Filter assets by status (Operational, Degraded, Down) or category to quickly find what you need.",
          "Click any asset row to view detailed information including sensor data, work order history, and health scores.",
          "Assets marked as CRITICAL or HIGH criticality should be prioritized for preventive maintenance.",
        ]}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {["Asset Tag", "Name", "Status", "Criticality", "Category", "Location", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No assets found.
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr
                  key={asset.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => router.push(`/assets/${asset.id}`)}
                >
                  <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                    {asset.assetTag}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {asset.name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[asset.status] ?? ""}`}
                    >
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${CRITICALITY_BADGE[asset.criticality] ?? ""}`}
                    >
                      {asset.criticality}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {asset.category?.name ?? "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {asset.location ?? "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="text-orange-600 hover:text-orange-800 dark:hover:text-orange-400 text-sm font-medium"
                        onClick={() => openEdit(asset)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800 dark:hover:text-red-400 text-sm font-medium"
                        onClick={() => handleDelete(asset.id)}
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Asset" : "Create Asset"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Asset Tag *</Label>
                <Input
                  value={form.assetTag}
                  onChange={(e) => setForm({ ...form, assetTag: e.target.value })}
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
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Criticality</Label>
                <Select
                  value={form.criticality}
                  onChange={(e) => setForm({ ...form, criticality: e.target.value })}
                >
                  {CRITICALITY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Manufacturer</Label>
                <Input
                  value={form.manufacturer}
                  onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input
                  value={form.serialNumber}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Install Date</Label>
                <Input
                  type="date"
                  value={form.installDate}
                  onChange={(e) => setForm({ ...form, installDate: e.target.value })}
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
                <Label>Category</Label>
                <Select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
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
