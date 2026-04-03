import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json([]);
  }

  const searchFilter = { contains: q, mode: "insensitive" as const };

  const [assets, workOrders, parts, technicians] = await Promise.all([
    prisma.asset.findMany({
      where: {
        organizationId: orgId,
        OR: [{ name: searchFilter }, { assetTag: searchFilter }],
      },
      select: { id: true, name: true, assetTag: true },
      take: 5,
    }),
    prisma.maintenanceWorkOrder.findMany({
      where: {
        organizationId: orgId,
        OR: [{ orderNumber: searchFilter }, { title: searchFilter }],
      },
      select: { id: true, orderNumber: true, title: true },
      take: 5,
    }),
    prisma.part.findMany({
      where: {
        organizationId: orgId,
        OR: [{ partNumber: searchFilter }, { name: searchFilter }],
      },
      select: { id: true, partNumber: true, name: true },
      take: 5,
    }),
    prisma.technician.findMany({
      where: {
        organizationId: orgId,
        OR: [{ name: searchFilter }, { employeeId: searchFilter }],
      },
      select: { id: true, name: true, employeeId: true },
      take: 5,
    }),
  ]);

  const results = [
    ...assets.map((a) => ({
      type: "Asset",
      id: a.id,
      title: a.name,
      subtitle: a.assetTag,
      link: `/assets/${a.id}`,
    })),
    ...workOrders.map((w) => ({
      type: "Work Order",
      id: w.id,
      title: w.title,
      subtitle: w.orderNumber,
      link: `/work-orders/${w.id}`,
    })),
    ...parts.map((p) => ({
      type: "Part",
      id: p.id,
      title: p.name,
      subtitle: p.partNumber,
      link: `/parts/${p.id}`,
    })),
    ...technicians.map((t) => ({
      type: "Technician",
      id: t.id,
      title: t.name,
      subtitle: t.employeeId ?? "",
      link: `/technicians/${t.id}`,
    })),
  ];

  return NextResponse.json(results);
}
