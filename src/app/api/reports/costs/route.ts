import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;

  const assets = await prisma.asset.findMany({
    where: { organizationId: orgId },
    select: { id: true, assetTag: true, name: true },
  });

  const results = [];

  for (const asset of assets) {
    const workOrders = await prisma.maintenanceWorkOrder.findMany({
      where: {
        assetId: asset.id,
        organizationId: orgId,
        status: "COMPLETED",
      },
      select: {
        laborCost: true,
        partsCost: true,
        actualHours: true,
        technician: { select: { hourlyRate: true } },
        partUsages: { select: { unitCost: true, quantity: true } },
      },
    });

    let laborCost = 0;
    let partsCost = 0;

    for (const wo of workOrders) {
      // Prefer stored snapshot columns when populated; otherwise derive cost
      // live. laborCost = actualHours × technician hourlyRate; partsCost = sum
      // of each PartUsage's unitCost × quantity. The stored columns are never
      // written by the current code, so without this the report was always empty.
      const storedLabor = Number(wo.laborCost ?? 0);
      const derivedLabor =
        (wo.actualHours ?? 0) * Number(wo.technician?.hourlyRate ?? 0);
      laborCost += storedLabor > 0 ? storedLabor : derivedLabor;

      const storedParts = Number(wo.partsCost ?? 0);
      const derivedParts = wo.partUsages.reduce(
        (sum, pu) => sum + Number(pu.unitCost ?? 0) * pu.quantity,
        0
      );
      partsCost += storedParts > 0 ? storedParts : derivedParts;
    }

    if (laborCost === 0 && partsCost === 0) continue;

    results.push({
      assetTag: asset.assetTag,
      name: asset.name,
      laborCost: Math.round(laborCost * 100) / 100,
      partsCost: Math.round(partsCost * 100) / 100,
      totalCost: Math.round((laborCost + partsCost) * 100) / 100,
    });
  }

  return NextResponse.json(results);
}
