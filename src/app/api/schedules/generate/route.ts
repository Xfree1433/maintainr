import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

const DAY_MS = 24 * 60 * 60 * 1000;

// GAP-01: PM schedule -> work-order auto-generator.
//
// There is no background scheduler in this deployment, so generation is an
// explicit, idempotent action: POST here turns every *due* (nextDue <= now),
// *enabled* schedule into an OPEN preventive work order, then advances the
// schedule's nextDue past now and stamps lastPerformed. A schedule that already
// has an open (non-closed) work order is skipped so repeated clicks — or a cron
// hitting this route — never pile up duplicate WOs for the same cycle.
//
// GET returns a preview (count + list of due schedules) without mutating.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;
  const now = new Date();

  const due = await prisma.maintenanceSchedule.findMany({
    where: { organizationId: orgId, enabled: true, nextDue: { lte: now } },
    include: { asset: { select: { id: true, name: true } } },
    orderBy: { nextDue: "asc" },
  });

  // Order-number base — incremented locally so a batch stays collision-free
  // under the [organizationId, orderNumber] unique constraint.
  let woCount = await prisma.maintenanceWorkOrder.count({
    where: { organizationId: orgId },
  });

  const generated: { scheduleId: string; orderNumber: string }[] = [];
  const skipped: string[] = [];

  for (const s of due) {
    // Skip if this schedule already has an open work order awaiting action.
    const openWo = await prisma.maintenanceWorkOrder.findFirst({
      where: {
        organizationId: orgId,
        scheduleId: s.id,
        status: { in: ["OPEN", "IN_PROGRESS", "ON_HOLD"] },
      },
      select: { id: true },
    });
    if (openWo) {
      skipped.push(s.id);
      continue;
    }

    woCount += 1;
    const orderNumber = `WO-${String(woCount).padStart(5, "0")}`;

    // Advance nextDue past now in interval steps so an overdue schedule doesn't
    // immediately re-qualify on the next run.
    const interval = s.intervalDays > 0 ? s.intervalDays : 1;
    let next = new Date(s.nextDue);
    while (next <= now) next = new Date(next.getTime() + interval * DAY_MS);

    const descriptionParts = [s.description, s.checklist].filter(Boolean);

    const [workOrder] = await prisma.$transaction([
      prisma.maintenanceWorkOrder.create({
        data: {
          orderNumber,
          title: s.name,
          description: descriptionParts.length
            ? descriptionParts.join("\n\n")
            : null,
          type: "PREVENTIVE",
          status: "OPEN",
          priority: "MEDIUM",
          assetId: s.assetId,
          scheduleId: s.id,
          organizationId: orgId,
          assigneeId: session.user.id,
          estimatedHours: s.estimatedHours ?? undefined,
          dueDate: s.nextDue,
        },
      }),
      prisma.maintenanceSchedule.update({
        where: { id: s.id },
        data: { lastPerformed: now, nextDue: next },
      }),
    ]);

    generated.push({ scheduleId: s.id, orderNumber: workOrder.orderNumber });

    notify({
      organizationId: orgId,
      type: "WORK_ORDER",
      title: "Preventive work order generated",
      message: `${workOrder.orderNumber}: ${s.name} (${s.asset?.name ?? "asset"})`,
      link: `/work-orders/${workOrder.id}`,
    });
  }

  if (generated.length > 0) {
    logAudit({
      action: "schedule.generate",
      entityType: "Schedule",
      userId: session.user.id,
      organizationId: orgId,
      metadata: { generated: generated.length, skipped: skipped.length },
    });
  }

  return NextResponse.json({
    generated: generated.length,
    skipped: skipped.length,
    dueCount: due.length,
    workOrders: generated,
  });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;
  const now = new Date();

  const due = await prisma.maintenanceSchedule.findMany({
    where: { organizationId: orgId, enabled: true, nextDue: { lte: now } },
    select: { id: true, name: true, nextDue: true, assetId: true },
    orderBy: { nextDue: "asc" },
  });

  return NextResponse.json({ dueCount: due.length, due });
}
