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
    const downtimeEvents = await prisma.downtimeEvent.findMany({
      where: {
        assetId: asset.id,
        planned: false,
        endedAt: { not: null },
      },
      orderBy: { startedAt: "asc" },
      select: { startedAt: true, endedAt: true },
    });

    if (downtimeEvents.length < 2) continue;

    let totalTimeBetween = 0;
    for (let i = 1; i < downtimeEvents.length; i++) {
      const prevEnd = downtimeEvents[i - 1].endedAt!;
      const nextStart = downtimeEvents[i].startedAt;
      totalTimeBetween += nextStart.getTime() - prevEnd.getTime();
    }

    const mtbfHours = Math.round(
      totalTimeBetween / (downtimeEvents.length - 1) / (1000 * 60 * 60) * 10
    ) / 10;

    results.push({
      assetTag: asset.assetTag,
      name: asset.name,
      mtbfHours,
    });
  }

  return NextResponse.json(results);
}
