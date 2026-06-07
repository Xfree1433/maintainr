import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { workOrderCreateSchema } from "@/lib/validators";
import { captureServer } from "@/lib/posthog";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const type = searchParams.get("type") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const assetId = searchParams.get("assetId") ?? "";

  const where: Record<string, unknown> = { organizationId: orgId };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { orderNumber: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;
  if (type) where.type = type;
  if (priority) where.priority = priority;
  if (assetId) where.assetId = assetId;

  const workOrders = await prisma.maintenanceWorkOrder.findMany({
    where: where as any,
    include: {
      asset: { select: { name: true, assetTag: true } },
      technician: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ workOrders });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;

  const body = await req.json();
  const parsed = workOrderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const count = await prisma.maintenanceWorkOrder.count({ where: { organizationId: orgId } });
  const orderNumber = `WO-${String(count + 1).padStart(5, "0")}`;

  const workOrder = await prisma.maintenanceWorkOrder.create({
    data: {
      ...parsed.data,
      orderNumber,
      organizationId: orgId,
      assigneeId: session.user.id,
    },
  });

  logAudit({
    action: "CREATE",
    entityType: "WorkOrder",
    entityId: workOrder.id,
    userId: session.user.id,
    organizationId: orgId,
  });

  // Analytics: creating a work order is MAINTAINR's core action.
  // Activation = first occurrence (derived in PostHog). Fire-and-forget on this path.
  const actorId = (session.user.email ?? session.user.id) as string;
  void captureServer(
    "core_action_performed",
    actorId,
    { action: "work_order_created" },
    { account: orgId, awaitFlush: false }
  );

  return NextResponse.json({ workOrder }, { status: 201 });
}
