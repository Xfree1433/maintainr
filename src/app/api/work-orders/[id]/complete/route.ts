import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

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
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { actualHours, notes } = body as {
    actualHours?: number;
    notes?: string;
  };

  const workOrder = await prisma.maintenanceWorkOrder.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      ...(actualHours !== undefined && { actualHours }),
      ...(notes !== undefined && { notes }),
    },
  });

  await prisma.asset.update({
    where: { id: existing.assetId },
    data: { status: "OPERATIONAL" },
  });

  logAudit({
    action: "COMPLETE",
    entityType: "WorkOrder",
    entityId: workOrder.id,
    userId: session.user.id,
    organizationId: orgId,
  });

  return NextResponse.json({ workOrder });
}
