import { prisma } from "@/lib/prisma";

/**
 * Cross-tenant ownership guards.
 *
 * MAINTAINR runs as a shared multi-customer instance. Several write routes
 * validate the top-level record's org but then trust a child foreign key
 * (assetId, technicianId, scheduleId, alertId, parentId, facilityId,
 * categoryId) supplied in the request body. Without these checks a caller
 * could inject another customer's id and link/read/write across the tenant
 * boundary. Each guard returns true when the FK is absent (null/undefined) so
 * "optional FK omitted" stays valid, and otherwise only when the referenced
 * row belongs to `orgId`.
 *
 * Every referenced model carries a direct `organizationId`, so the lookups are
 * simple id+org scoped finds.
 */

export async function assetInOrg(
  assetId: string | null | undefined,
  orgId: string
): Promise<boolean> {
  if (!assetId) return true;
  const row = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: orgId },
    select: { id: true },
  });
  return !!row;
}

export async function technicianInOrg(
  technicianId: string | null | undefined,
  orgId: string
): Promise<boolean> {
  if (!technicianId) return true;
  const row = await prisma.technician.findFirst({
    where: { id: technicianId, organizationId: orgId },
    select: { id: true },
  });
  return !!row;
}

export async function scheduleInOrg(
  scheduleId: string | null | undefined,
  orgId: string
): Promise<boolean> {
  if (!scheduleId) return true;
  const row = await prisma.maintenanceSchedule.findFirst({
    where: { id: scheduleId, organizationId: orgId },
    select: { id: true },
  });
  return !!row;
}

export async function alertInOrg(
  alertId: string | null | undefined,
  orgId: string
): Promise<boolean> {
  if (!alertId) return true;
  const row = await prisma.predictiveAlert.findFirst({
    where: { id: alertId, organizationId: orgId },
    select: { id: true },
  });
  return !!row;
}

export async function categoryInOrg(
  categoryId: string | null | undefined,
  orgId: string
): Promise<boolean> {
  if (!categoryId) return true;
  const row = await prisma.assetCategory.findFirst({
    where: { id: categoryId, organizationId: orgId },
    select: { id: true },
  });
  return !!row;
}

export async function facilityInOrg(
  facilityId: string | null | undefined,
  orgId: string
): Promise<boolean> {
  if (!facilityId) return true;
  const row = await prisma.facility.findFirst({
    where: { id: facilityId, organizationId: orgId },
    select: { id: true },
  });
  return !!row;
}
