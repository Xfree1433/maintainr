import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { workOrderCompleteSchema } from "@/lib/validators";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;
  const { id } = await params;

  const existing = await prisma.maintenanceWorkOrder.findFirst({
    where: { id, organizationId: orgId },
    include: { asset: { select: { status: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = workOrderCompleteSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { actualHours, notes, assetStatus } = parsed.data;

  // Note: we intentionally do NOT backfill startedAt here. A WO completed
  // straight from OPEN keeps startedAt=null so it stays excluded from MTTR
  // (GAP-04) rather than reporting a misleading ~0h repair time.
  const workOrder = await prisma.maintenanceWorkOrder.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      ...(actualHours !== undefined && { actualHours }),
      ...(notes !== undefined && { notes }),
    },
  });

  // GAP-02: only restore OPERATIONAL by default; honor an explicit override; and
  // never silently flip a DECOMMISSIONED asset back to operational.
  const currentStatus = existing.asset?.status;
  const nextAssetStatus =
    assetStatus ?? (currentStatus === "DECOMMISSIONED" ? null : "OPERATIONAL");

  if (nextAssetStatus && nextAssetStatus !== currentStatus) {
    await prisma.asset.update({
      where: { id: existing.assetId },
      data: { status: nextAssetStatus },
    });
  }

  logAudit({
    action: "COMPLETE",
    entityType: "WorkOrder",
    entityId: workOrder.id,
    userId: session.user.id,
    organizationId: orgId,
    metadata: { assetStatus: nextAssetStatus ?? currentStatus },
  });

  return NextResponse.json({ workOrder });
}
