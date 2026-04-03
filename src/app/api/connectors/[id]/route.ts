import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const connectorUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(["PENDING", "CONNECTED", "SYNCING", "ERROR", "DISABLED"]).optional(),
  direction: z.enum(["IMPORT", "EXPORT", "BIDIRECTIONAL"]).optional(),
  config: z.string().optional(),
  fieldMapping: z.string().optional(),
  syncEntities: z.array(z.string()).optional(),
  syncFrequency: z.string().optional(),
});

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

  const connector = await prisma.connector.findFirst({
    where: { id, organizationId: orgId },
    include: {
      syncLogs: {
        orderBy: { startedAt: "desc" },
        take: 20,
      },
    },
  });

  if (!connector) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ connector });
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

  const existing = await prisma.connector.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = connectorUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const connector = await prisma.connector.update({
    where: { id },
    data: parsed.data,
  });

  logAudit({
    action: "connector.updated",
    entityType: "Connector",
    entityId: connector.id,
    userId: session.user.id,
    organizationId: orgId,
  });

  return NextResponse.json({ connector });
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

  const existing = await prisma.connector.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.connector.delete({ where: { id } });

  logAudit({
    action: "connector.deleted",
    entityType: "Connector",
    entityId: id,
    userId: session.user.id,
    organizationId: orgId,
  });

  return NextResponse.json({ success: true });
}
