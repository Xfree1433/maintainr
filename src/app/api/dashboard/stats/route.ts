import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Open work orders
  const openWorkOrders = await prisma.maintenanceWorkOrder.count({
    where: {
      organizationId: orgId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
  });

  // Overdue schedules
  const overdueSchedules = await prisma.maintenanceSchedule.count({
    where: {
      organizationId: orgId,
      nextDue: { lt: now },
      enabled: true,
    },
  });

  // Active alerts
  const activeAlerts = await prisma.predictiveAlert.count({
    where: {
      organizationId: orgId,
      status: "ACTIVE",
    },
  });

  // Low stock parts
  const lowStockParts = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM "Part"
    WHERE "organizationId" = ${orgId}
    AND "quantity" < "minStock"
  `;
  const lowStockCount = Number(lowStockParts[0]?.count ?? 0);

  // Asset status breakdown
  const assetStatusRaw = await prisma.asset.groupBy({
    by: ["status"],
    where: { organizationId: orgId },
    _count: { id: true },
  });
  const assetStatusBreakdown = assetStatusRaw.map((r) => ({
    status: r.status,
    count: r._count.id,
  }));

  // Recent activity (last 10 audit logs)
  const recentActivity = await prisma.auditLog.findMany({
    where: { organizationId: orgId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Work order trend (last 7 days)
  const workOrderTrend: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const count = await prisma.maintenanceWorkOrder.count({
      where: {
        organizationId: orgId,
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    });

    workOrderTrend.push({
      date: dayStart.toISOString().split("T")[0],
      count,
    });
  }

  // Uptime percent
  const totalAssets = await prisma.asset.count({
    where: { organizationId: orgId },
  });

  const unplannedDowntime = await prisma.downtimeEvent.findMany({
    where: {
      organizationId: orgId,
      planned: false,
      startedAt: { gte: sevenDaysAgo },
    },
    select: { startedAt: true, endedAt: true, durationMin: true },
  });

  let totalDowntimeMin = 0;
  for (const dt of unplannedDowntime) {
    if (dt.durationMin) {
      totalDowntimeMin += dt.durationMin;
    } else if (dt.endedAt) {
      totalDowntimeMin += Math.round(
        (dt.endedAt.getTime() - dt.startedAt.getTime()) / (1000 * 60)
      );
    } else {
      // Ongoing downtime
      totalDowntimeMin += Math.round(
        (now.getTime() - dt.startedAt.getTime()) / (1000 * 60)
      );
    }
  }

  const totalPossibleMin = totalAssets * 7 * 24 * 60;
  const uptimePercent =
    totalPossibleMin > 0
      ? Math.round((1 - totalDowntimeMin / totalPossibleMin) * 10000) / 100
      : 100;

  return NextResponse.json({
    openWorkOrders,
    overdueSchedules,
    activeAlerts,
    lowStockParts: lowStockCount,
    assetStatusBreakdown,
    recentActivity,
    workOrderTrend,
    uptimePercent,
  });
}
