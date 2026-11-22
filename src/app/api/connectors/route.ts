import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { maskConnector } from "@/lib/connector-secrets";
import { z } from "zod";
import { readBody } from "@/lib/read-body";

const connectorCreateSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["SAP", "ORACLE", "DYNAMICS_365", "ODBC", "POSTGRESQL", "MYSQL", "MSSQL", "REST_API", "CSV_UPLOAD"]),
  direction: z.enum(["IMPORT", "EXPORT", "BIDIRECTIONAL"]).default("IMPORT"),
  config: z.string().optional(),
  fieldMapping: z.string().optional(),
  syncEntities: z.array(z.string()).default(["ASSETS"]),
  syncFrequency: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "";
  const status = searchParams.get("status") ?? "";

  const where: Record<string, unknown> = { organizationId: orgId };
  if (type) where.type = type;
  if (status) where.status = status;

  const connectors = await prisma.connector.findMany({
    where: where as any,
    include: {
      _count: { select: { syncLogs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ connectors: connectors.map(maskConnector) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;

  // Operators can't delete or reconfigure (same membership-role check as profile).
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
    select: { role: true },
  });
  if (!membership || membership.role === "OPERATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await readBody(req);
  const parsed = connectorCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const connector = await prisma.connector.create({
    data: {
      ...parsed.data,
      organizationId: orgId,
    },
  });

  logAudit({
    action: "connector.created",
    entityType: "Connector",
    entityId: connector.id,
    userId: session.user.id,
    organizationId: orgId,
    metadata: { type: connector.type, direction: connector.direction },
  });

  return NextResponse.json({ connector: maskConnector(connector) }, { status: 201 });
}
