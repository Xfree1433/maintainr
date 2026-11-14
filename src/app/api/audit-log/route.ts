import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseTakeSkip } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType") ?? "";
  const action = searchParams.get("action") ?? "";
  const paging = parseTakeSkip(searchParams.get("take"), searchParams.get("skip"));
  if (!paging) {
    return NextResponse.json({ error: "take and skip must be whole numbers" }, { status: 400 });
  }
  const { take, skip } = paging;

  const where: Record<string, unknown> = { organizationId: orgId };

  if (entityType) {
    where.entityType = entityType;
  }
  if (action) {
    where.action = action;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: where as any,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.auditLog.count({ where: where as any }),
  ]);

  return NextResponse.json({ logs, total });
}
