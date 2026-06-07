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

    // MTBF = mean time between failure onsets. Measure start-to-start rather
    // than prev-end-to-next-start: overlapping/zero-duration events made the
    // end-to-start delta negative, dragging the mean below zero. Skip any
    // non-positive interval defensively (events not strictly ordered).
    let totalTimeBetween = 0;
    let intervals = 0;
    for (let i = 1; i < downtimeEvents.length; i++) {
      const prevStart = downtimeEvents[i - 1].startedAt;
      const nextStart = downtimeEvents[i].startedAt;
      const delta = nextStart.getTime() - prevStart.getTime();
      if (delta <= 0) continue;
      totalTimeBetween += delta;
      intervals++;
    }

    if (intervals === 0) continue;

    const mtbfHours = Math.round(
      totalTimeBetween / intervals / (1000 * 60 * 60) * 10
    ) / 10;

    results.push({
      assetTag: asset.assetTag,
      name: asset.name,
      mtbfHours,
    });
  }

  return NextResponse.json(results);
}
