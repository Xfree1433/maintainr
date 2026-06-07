import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { workOrderUpdateSchema } from "@/lib/validators";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;
  const { id } = await params;

  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id, organizationId: orgId },
    include: {
      asset: true,
      technician: true,
      partUsages: { include: { part: true } },
    },
  });

  if (!workOrder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ workOrder });
}

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

  const existing = await prisma.maintenanceWorkOrder.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = workOrderUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.status === "IN_PROGRESS" && existing.status !== "IN_PROGRESS") {
    data.startedAt = new Date();
  }

  if (parsed.data.status === "COMPLETED" && existing.status !== "COMPLETED") {
    data.completedAt = new Date();
    // GAP-02: don't force a DECOMMISSIONED asset back to OPERATIONAL.
    const asset = await prisma.asset.findUnique({
      where: { id: existing.assetId },
      select: { status: true },
    });
    if (asset && asset.status !== "DECOMMISSIONED") {
      await prisma.asset.update({
        where: { id: existing.assetId },
        data: { status: "OPERATIONAL" },
      });
    }
  }

  const workOrder = await prisma.maintenanceWorkOrder.update({
    where: { id },
    data: data as any,
  });

  logAudit({
    action: "UPDATE",
    entityType: "WorkOrder",
    entityId: workOrder.id,
    userId: session.user.id,
    organizationId: orgId,
  });

  return NextResponse.json({ workOrder });
}

export async function DELETE(
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

  await prisma.maintenanceWorkOrder.delete({ where: { id } });

  logAudit({
    action: "DELETE",
    entityType: "WorkOrder",
    entityId: id,
    userId: session.user.id,
    organizationId: orgId,
  });

  return NextResponse.json({ success: true });
}
