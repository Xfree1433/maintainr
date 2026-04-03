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
    select: {
      id: true,
      assetTag: true,
      name: true,
      status: true,
    },
  });

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const results = await Promise.all(
    assets.map(async (asset) => {
      let healthScore = 100;

      // Deduct 20 for each ACTIVE CRITICAL alert
      const criticalAlerts = await prisma.predictiveAlert.count({
        where: {
          assetId: asset.id,
          status: "ACTIVE",
          severity: "CRITICAL",
        },
      });
      healthScore -= criticalAlerts * 20;

      // Deduct 10 for each ACTIVE WARNING alert
      const warningAlerts = await prisma.predictiveAlert.count({
        where: {
          assetId: asset.id,
          status: "ACTIVE",
          severity: "WARNING",
        },
      });
      healthScore -= warningAlerts * 10;

      // Deduct 5 for each anomalous sensor reading in last 24h
      const anomalousReadings = await prisma.sensorReading.count({
        where: {
          assetId: asset.id,
          anomaly: true,
          timestamp: { gte: twentyFourHoursAgo },
        },
      });
      healthScore -= anomalousReadings * 5;

      // Deduct 15 if asset has ongoing unplanned downtime
      const ongoingDowntime = await prisma.downtimeEvent.count({
        where: {
          assetId: asset.id,
          endedAt: null,
          planned: false,
        },
      });
      if (ongoingDowntime > 0) {
        healthScore -= 15;
      }

      // Clamp to 0-100
      healthScore = Math.max(0, Math.min(100, healthScore));

      return {
        assetId: asset.id,
        assetTag: asset.assetTag,
        name: asset.name,
        status: asset.status,
        healthScore,
      };
    })
  );

  return NextResponse.json(results);
}
