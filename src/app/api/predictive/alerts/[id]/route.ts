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

  const existing = await prisma.predictiveAlert.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { status } = body;

  if (!["ACKNOWLEDGED", "RESOLVED", "FALSE_POSITIVE"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid status. Must be ACKNOWLEDGED, RESOLVED, or FALSE_POSITIVE" },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = { status };
  if (status === "RESOLVED" || status === "FALSE_POSITIVE") {
    data.resolvedAt = new Date();
  }

  const alert = await prisma.predictiveAlert.update({
    where: { id },
    data: data as any,
    include: { asset: { select: { name: true, assetTag: true } } },
  });

  logAudit({
    action: "predictive_alert.update",
    entityType: "PredictiveAlert",
    entityId: alert.id,
    userId: session.user.id,
    organizationId: orgId,
    metadata: { status, title: alert.title },
  });

  return NextResponse.json(alert);
}
