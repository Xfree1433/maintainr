import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { assetUpdateSchema } from "@/lib/validators";

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

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      category: true,
      facility: true,
      workOrders: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      sensorReadings: {
        orderBy: { timestamp: "desc" },
        take: 20,
      },
      schedules: {
        orderBy: { nextDue: "asc" },
      },
      downtimeEvents: {
        orderBy: { startedAt: "desc" },
        take: 25,
      },
    },
  });

  if (!asset || asset.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(asset);
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

  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = assetUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const asset = await prisma.asset.update({
    where: { id },
    data: parsed.data,
    include: { category: true },
  });

  logAudit({
    action: "asset.update",
    entityType: "Asset",
    entityId: asset.id,
    userId: session.user.id,
    organizationId: orgId,
    metadata: { changes: Object.keys(parsed.data) },
  });

  return NextResponse.json(asset);
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

  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.asset.delete({ where: { id } });

  logAudit({
    action: "asset.delete",
    entityType: "Asset",
    entityId: id,
    userId: session.user.id,
    organizationId: orgId,
    metadata: { assetTag: existing.assetTag, name: existing.name },
  });

  return NextResponse.json({ success: true });
}
