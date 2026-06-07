import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { partUsageCreateSchema } from "@/lib/validators";

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
  });
  if (!workOrder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const partUsages = await prisma.partUsage.findMany({
    where: { workOrderId: id },
    include: { part: true },
  });

  return NextResponse.json({ partUsages });
}

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

  const workOrder = await prisma.maintenanceWorkOrder.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!workOrder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = partUsageCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Scope the part to this org so you can't attach (or decrement) another
  // tenant's inventory by guessing an id.
  const part = await prisma.part.findFirst({
    where: { id: parsed.data.partId, organizationId: orgId },
  });
  if (!part) {
    return NextResponse.json({ error: "Part not found" }, { status: 404 });
  }

  // Guard against driving inventory negative — reject if we can't cover the
  // requested quantity.
  if (part.quantity < parsed.data.quantity) {
    return NextResponse.json(
      {
        error: `Insufficient stock: ${part.quantity} available, ${parsed.data.quantity} requested`,
      },
      { status: 400 }
    );
  }

  // Create the usage and decrement stock atomically so a failure can't leave
  // a usage row without a matching stock deduction (or vice versa).
  const [partUsage] = await prisma.$transaction([
    prisma.partUsage.create({
      data: {
        workOrderId: id,
        partId: parsed.data.partId,
        quantity: parsed.data.quantity,
        unitCost: part.unitCost,
      },
      include: { part: true },
    }),
    prisma.part.update({
      where: { id: parsed.data.partId },
      data: { quantity: { decrement: parsed.data.quantity } },
    }),
  ]);

  logAudit({
    action: "ADD_PART",
    entityType: "WorkOrder",
    entityId: id,
    userId: session.user.id,
    organizationId: orgId,
    metadata: { partId: parsed.data.partId, quantity: parsed.data.quantity },
  });

  return NextResponse.json({ partUsage }, { status: 201 });
}
