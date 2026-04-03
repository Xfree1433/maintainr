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
  const status = searchParams.get("status") ?? "";
  const severity = searchParams.get("severity") ?? "";
  const assetId = searchParams.get("assetId") ?? "";

  const where: Record<string, unknown> = { organizationId: orgId };

  if (status) {
    where.status = status;
  }
  if (severity) {
    where.severity = severity;
  }
  if (assetId) {
    where.assetId = assetId;
  }

  const alerts = await prisma.predictiveAlert.findMany({
    where: where as any,
    include: { asset: { select: { name: true, assetTag: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(alerts);
}
