import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { maskConnector, restoreMaskedSecrets } from "@/lib/connector-secrets";
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

  return NextResponse.json({ connector: maskConnector(connector) });
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

  // Operators can't delete or reconfigure (same membership-role check as profile).
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
    select: { role: true },
  });
  if (!membership || membership.role === "OPERATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  // A secret sent back still masked (round-tripped from a read) keeps its stored value.
  const data = { ...parsed.data };
  if (data.config !== undefined) {
    data.config = restoreMaskedSecrets(data.config, existing.config);
  }

  const connector = await prisma.connector.update({
    where: { id },
    data,
  });

  logAudit({
    action: "connector.updated",
    entityType: "Connector",
    entityId: connector.id,
    userId: session.user.id,
    organizationId: orgId,
  });

  return NextResponse.json({ connector: maskConnector(connector) });
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
