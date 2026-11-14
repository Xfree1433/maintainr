import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { scheduleUpdateSchema } from "@/lib/validators";
import { assetInOrg } from "@/lib/ownership";

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

  const schedule = await prisma.maintenanceSchedule.findFirst({
    where: { id, organizationId: orgId },
    include: { asset: true },
  });

  if (!schedule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ schedule });
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

  const existing = await prisma.maintenanceSchedule.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = scheduleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // A re-pointed asset must stay within the caller's org.
  if (!(await assetInOrg(parsed.data.assetId, orgId))) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const schedule = await prisma.maintenanceSchedule.update({
    where: { id },
    data: parsed.data,
  });

  logAudit({
    action: "UPDATE",
    entityType: "Schedule",
    entityId: schedule.id,
    userId: session.user.id,
    organizationId: orgId,
  });

  return NextResponse.json({ schedule });
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

  // Operators can't delete or reconfigure (same membership-role check as profile).
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
    select: { role: true },
  });
  if (!membership || membership.role === "OPERATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.maintenanceSchedule.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.maintenanceSchedule.delete({ where: { id } });

  logAudit({
    action: "DELETE",
    entityType: "Schedule",
    entityId: id,
    userId: session.user.id,
    organizationId: orgId,
  });

  return NextResponse.json({ success: true });
}
