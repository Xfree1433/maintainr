import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { scheduleCreateSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const assetId = searchParams.get("assetId") ?? "";

  const where: Record<string, unknown> = { organizationId: orgId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (assetId) where.assetId = assetId;

  const schedules = await prisma.maintenanceSchedule.findMany({
    where: where as any,
    include: {
      asset: { select: { name: true, assetTag: true } },
    },
    orderBy: { nextDue: "asc" },
  });

  return NextResponse.json({ schedules });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;

  const body = await req.json();
  const parsed = scheduleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schedule = await prisma.maintenanceSchedule.create({
    data: {
      ...parsed.data,
      organizationId: orgId,
    },
  });

  logAudit({
    action: "CREATE",
    entityType: "Schedule",
    entityId: schedule.id,
    userId: session.user.id,
    organizationId: orgId,
  });

  return NextResponse.json({ schedule }, { status: 201 });
}
