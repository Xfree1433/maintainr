import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;
  const { id } = await params;

  const existing = await prisma.downtimeEvent.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const endedAt = new Date(body.endedAt);

  const durationMin = Math.round(
    (endedAt.getTime() - existing.startedAt.getTime()) / (1000 * 60)
  );

  const event = await prisma.downtimeEvent.update({
    where: { id },
    data: {
      endedAt,
      durationMin,
    },
    include: { asset: { select: { name: true, assetTag: true } } },
  });

  logAudit({
    action: "downtime.end",
    entityType: "DowntimeEvent",
    entityId: event.id,
    userId: session.user.id,
    organizationId: orgId,
    metadata: { durationMin, endedAt: endedAt.toISOString() },
  });

  return NextResponse.json(event);
}
