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

  // An unreadable body, a missing/invalid endedAt or one before the start
  // used to go straight through: an Invalid Date was a 500 from Prisma, and
  // an end time before the start stored a NEGATIVE duration, which then
  // dragged every downtime / MTTR figure built on durationMin the wrong way.
  const body = await req.json().catch(() => null);
  const raw = body && typeof body === "object" ? (body as any).endedAt : undefined;
  const endedAt = raw === undefined || raw === null || raw === "" ? new Date() : new Date(raw);
  if (Number.isNaN(endedAt.getTime())) {
    return NextResponse.json({ error: "endedAt is not a valid date" }, { status: 400 });
  }
  if (endedAt.getTime() < existing.startedAt.getTime()) {
    return NextResponse.json(
      { error: "Downtime cannot end before it started" },
      { status: 400 }
    );
  }
  // Allow a little clock drift between the browser and the server, no more.
  if (endedAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return NextResponse.json({ error: "endedAt cannot be in the future" }, { status: 400 });
  }

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
