import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { downtimeCreateSchema } from "@/lib/validators";
import { assetInOrg } from "@/lib/ownership";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;

  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get("assetId") ?? "";
  const planned = searchParams.get("planned") ?? "";

  const where: Record<string, unknown> = { organizationId: orgId };

  if (assetId) {
    where.assetId = assetId;
  }
  if (planned === "true") {
    where.planned = true;
  } else if (planned === "false") {
    where.planned = false;
  }

  const events = await prisma.downtimeEvent.findMany({
    where: where as any,
    include: { asset: { select: { name: true, assetTag: true } } },
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;

  const body = await req.json();
  const parsed = downtimeCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // The asset this downtime is logged against must belong to the caller's org.
  if (!(await assetInOrg(parsed.data.assetId, orgId))) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const event = await prisma.downtimeEvent.create({
    data: {
      ...parsed.data,
      organizationId: orgId,
    },
    include: { asset: { select: { name: true, assetTag: true } } },
  });

  logAudit({
    action: "downtime.create",
    entityType: "DowntimeEvent",
    entityId: event.id,
    userId: session.user.id,
    organizationId: orgId,
    metadata: { assetId: event.assetId, reason: event.reason },
  });

  return NextResponse.json(event, { status: 201 });
}
