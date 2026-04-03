import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";

  const where: Record<string, unknown> = {
    organizationId: orgId,
    OR: [{ userId }, { userId: null }],
  };
  if (unreadOnly) {
    where.read = false;
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.notification.count({
      where: {
        organizationId: orgId,
        OR: [{ userId }, { userId: null }],
        read: false,
      },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;
  const userId = session.user.id;

  const body = await req.json();
  const { id, all } = body as { id?: string; all?: boolean };

  if (all) {
    await prisma.notification.updateMany({
      where: {
        organizationId: orgId,
        OR: [{ userId }, { userId: null }],
        read: false,
      },
      data: { read: true },
    });
    return NextResponse.json({ success: true });
  }

  if (id) {
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.organizationId !== orgId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Provide id or all: true" }, { status: 400 });
}
