import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

  // Verify asset belongs to org
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset || asset.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "";
  const range = searchParams.get("range") ?? "30d";

  // Calculate date range
  const now = new Date();
  let daysBack = 30;
  if (range === "7d") daysBack = 7;
  else if (range === "90d") daysBack = 90;
  const since = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = {
    assetId: id,
    timestamp: { gte: since },
  };

  if (type) {
    where.type = type;
  }

  const readings = await prisma.sensorReading.findMany({
    where: where as any,
    orderBy: { timestamp: "desc" },
  });

  return NextResponse.json(readings);
}
