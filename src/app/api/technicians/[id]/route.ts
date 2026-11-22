import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { technicianUpdateSchema } from "@/lib/validators";
import { readBody } from "@/lib/read-body";

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

  const technician = await prisma.technician.findUnique({ where: { id } });
  if (!technician || technician.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(technician);
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

  const existing = await prisma.technician.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await readBody(req);
  const parsed = technicianUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const technician = await prisma.technician.update({
    where: { id },
    data: parsed.data,
  });

  logAudit({
    action: "technician.update",
    entityType: "Technician",
    entityId: technician.id,
    userId: session.user.id,
    organizationId: orgId,
    metadata: { changes: Object.keys(parsed.data) },
  });

  return NextResponse.json(technician);
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

  const existing = await prisma.technician.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.technician.delete({ where: { id } });

  logAudit({
    action: "technician.delete",
    entityType: "Technician",
    entityId: id,
    userId: session.user.id,
    organizationId: orgId,
    metadata: { name: existing.name },
  });

  return NextResponse.json({ success: true });
}
