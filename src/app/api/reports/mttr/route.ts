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
        type: { in: ["CORRECTIVE", "EMERGENCY"] },
        status: "COMPLETED",
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: { startedAt: true, completedAt: true },
    });

    if (workOrders.length === 0) continue;

    let totalRepairTime = 0;
    for (const wo of workOrders) {
      totalRepairTime +=
        wo.completedAt!.getTime() - wo.startedAt!.getTime();
    }

    const mttrHours = Math.round(
      totalRepairTime / workOrders.length / (1000 * 60 * 60) * 10
    ) / 10;

    results.push({
      assetTag: asset.assetTag,
      name: asset.name,
      mttrHours,
    });
  }

  return NextResponse.json(results);
}
