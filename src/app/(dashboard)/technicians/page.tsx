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
import { QuickGuide } from "@/components/ui/quick-guide";

interface Technician {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  employeeId?: string;
  skills?: string;
  certifications?: string;
  status: string;
  hourlyRate?: number;
}

const STATUS_OPTIONS = ["AVAILABLE", "ON_JOB", "OFF_SHIFT", "ON_LEAVE"];

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  ON_JOB: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  OFF_SHIFT: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  ON_LEAVE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
};

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  employeeId: "",
  skills: "",
  certifications: "",
  status: "AVAILABLE",
  hourlyRate: "",
};

function parseSkills(skills?: string): string[] {
  if (!skills) return [];
  try {
    const parsed = JSON.parse(skills);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // not JSON, treat as comma-separated
  }
  return skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function skillsToJson(commaStr: string): string {
  const arr = commaStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return JSON.stringify(arr);
}

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Technician | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchTechnicians = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/technicians?${params}`);
    if (res.ok) {
      setTechnicians(await res.json());
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((tech: Technician) => {
    setEditing(tech);
    setForm({
      name: tech.name,
      email: tech.email ?? "",
      phone: tech.phone ?? "",
      employeeId: tech.employeeId ?? "",
      skills: parseSkills(tech.skills).join(", "),
      certifications: tech.certifications ?? "",
      status: tech.status,
      hourlyRate: tech.hourlyRate != null ? String(tech.hourlyRate) : "",
    });
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: form.name,
      status: form.status,
    };
    if (form.email) payload.email = form.email;
    if (form.phone) payload.phone = form.phone;
    if (form.employeeId) payload.employeeId = form.employeeId;
    if (form.skills) payload.skills = skillsToJson(form.skills);
    if (form.certifications) payload.certifications = form.certifications;
    if (form.hourlyRate) payload.hourlyRate = Number(form.hourlyRate);

    const url = editing ? `/api/technicians/${editing.id}` : "/api/technicians";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setDialogOpen(false);
      fetchTechnicians();
    }
    setSaving(false);
  }, [form, editing, fetchTechnicians]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this technician?")) return;
      const res = await fetch(`/api/technicians/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTechnicians();
      }
    },
    [fetchTechnicians]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Technicians</h1>
        <Button onClick={openCreate}>Add Technician</Button>
      </div>

      <QuickGuide
        title="Quick Guide: Technicians"
        steps={[
          "Add maintenance team members with their skills, certifications, and hourly rates.",
          "Track technician availability: Available, On Job, Off Shift, or On Leave.",
          "Skills are displayed as tags — enter them as comma-separated values (e.g., Electrical, PLC, Hydraulics).",
          "Assign technicians to work orders based on their skills and availability.",
        ]}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search technicians..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {["Name", "Employee ID", "Email", "Skills", "Status", "Hourly Rate", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : technicians.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No technicians found.</td>
              </tr>
            ) : (
              technicians.map((tech) => {
                const skills = parseSkills(tech.skills);
                return (
                  <tr key={tech.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {tech.name}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">
                      {tech.employeeId ?? "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {tech.email ?? "\u2014"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {skills.length > 0
                          ? skills.map((skill) => (
                              <span
                                key={skill}
                                className="inline-flex items-center rounded-md bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
                              >
                                {skill}
                              </span>
                            ))
                          : <span className="text-sm text-gray-400">{"\u2014"}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[tech.status] ?? ""}`}
                      >
                        {tech.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {tech.hourlyRate != null ? `$${Number(tech.hourlyRate).toFixed(2)}` : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          className="text-orange-600 hover:text-orange-800 dark:hover:text-orange-400 text-sm font-medium"
                          onClick={() => openEdit(tech)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800 dark:hover:text-red-400 text-sm font-medium"
                          onClick={() => handleDelete(tech.id)}
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
            <DialogTitle>{editing ? "Edit Technician" : "Create Technician"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Employee ID</Label>
                <Input
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Skills (comma-separated)</Label>
              <Input
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="e.g. Electrical, Welding, HVAC"
              />
            </div>
            <div className="space-y-2">
              <Label>Certifications</Label>
              <Input
                value={form.certifications}
                onChange={(e) => setForm({ ...form, certifications: e.target.value })}
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
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hourly Rate</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.hourlyRate}
                  onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
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
