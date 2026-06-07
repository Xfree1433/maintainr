import { z } from "zod";

// ─── Assets ──────────────────────────────────────────────────────

export const assetCreateSchema = z.object({
  assetTag: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: z.enum(["OPERATIONAL", "DEGRADED", "DOWN", "MAINTENANCE", "DECOMMISSIONED"]).default("OPERATIONAL"),
  criticality: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  manufacturer: z.string().max(200).optional(),
  model: z.string().max(200).optional(),
  serialNumber: z.string().max(200).optional(),
  installDate: z.coerce.date().optional(),
  warrantyExpiry: z.coerce.date().optional(),
  location: z.string().max(500).optional(),
  facilityId: z.string().optional(),
  categoryId: z.string().optional(),
  purchaseCost: z.coerce.number().min(0).optional(),
  specifications: z.string().optional(),
});

export const assetUpdateSchema = assetCreateSchema.partial();

// ─── Work Orders ─────────────────────────────────────────────────

export const workOrderCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(["CORRECTIVE", "PREVENTIVE", "PREDICTIVE", "INSPECTION", "EMERGENCY"]),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  assetId: z.string().min(1),
  technicianId: z.string().optional(),
  scheduleId: z.string().optional(),
  alertId: z.string().optional(),
  estimatedHours: z.coerce.number().min(0).optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
});

export const workOrderUpdateSchema = workOrderCreateSchema.partial().extend({
  status: z.enum(["OPEN", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
  actualHours: z.coerce.number().min(0).optional(),
});

// Completing a work order. `assetStatus` is an optional explicit choice of the
// resulting asset status; when omitted the server restores OPERATIONAL unless
// the asset is DECOMMISSIONED (GAP-02 — completion no longer blindly forces
// every asset, including decommissioned ones, back to OPERATIONAL).
export const workOrderCompleteSchema = z.object({
  actualHours: z.coerce.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  assetStatus: z
    .enum(["OPERATIONAL", "DEGRADED", "DOWN", "MAINTENANCE", "DECOMMISSIONED"])
    .optional(),
});

// ─── Schedules ───────────────────────────────────────────────────

export const scheduleCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  assetId: z.string().min(1),
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "CUSTOM"]),
  intervalDays: z.coerce.number().int().min(1),
  nextDue: z.coerce.date(),
  estimatedHours: z.coerce.number().min(0).optional(),
  checklist: z.string().optional(),
  enabled: z.boolean().default(true),
});

export const scheduleUpdateSchema = scheduleCreateSchema.partial();

// ─── Parts ───────────────────────────────────────────────────────

export const partCreateSchema = z.object({
  partNumber: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  quantity: z.coerce.number().int().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(0),
  unitCost: z.coerce.number().min(0).optional(),
  location: z.string().max(200).optional(),
  supplier: z.string().max(200).optional(),
  leadTimeDays: z.coerce.number().int().min(0).optional(),
});

export const partUpdateSchema = partCreateSchema.partial();

// ─── Technicians ─────────────────────────────────────────────────

export const technicianCreateSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  employeeId: z.string().max(50).optional(),
  skills: z.string().optional(),
  certifications: z.string().optional(),
  status: z.enum(["AVAILABLE", "ON_JOB", "OFF_SHIFT", "ON_LEAVE"]).default("AVAILABLE"),
  hourlyRate: z.coerce.number().min(0).optional(),
});

export const technicianUpdateSchema = technicianCreateSchema.partial();

// ─── Downtime ────────────────────────────────────────────────────

export const downtimeCreateSchema = z.object({
  assetId: z.string().min(1),
  reason: z.enum(["BREAKDOWN", "PREVENTIVE_MAINTENANCE", "SETUP_CHANGEOVER", "MATERIAL_SHORTAGE", "OPERATOR_UNAVAILABLE", "QUALITY_ISSUE", "EXTERNAL", "OTHER"]),
  category: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  planned: z.boolean().default(false),
  startedAt: z.coerce.date(),
});

// ─── Part Usage ──────────────────────────────────────────────────

export const partUsageCreateSchema = z.object({
  partId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

// ─── Profile / Settings ──────────────────────────────────────────

export const profileUpdateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    // Organization rename — only applied for OWNER/ADMIN (enforced in route).
    organizationName: z.string().min(1).max(200).optional(),
  })
  .refine((d) => d.name !== undefined || d.organizationName !== undefined, {
    message: "Nothing to update",
  });

// ─── Facility ────────────────────────────────────────────────────

export const facilityCreateSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
});
