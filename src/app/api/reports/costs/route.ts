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
      select: { laborCost: true, partsCost: true },
    });

    let laborCost = 0;
    let partsCost = 0;

    for (const wo of workOrders) {
      laborCost += Number(wo.laborCost ?? 0);
      partsCost += Number(wo.partsCost ?? 0);
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
