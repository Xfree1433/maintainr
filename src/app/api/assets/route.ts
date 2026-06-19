import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { assetCreateSchema } from "@/lib/validators";
import { facilityInOrg, categoryInOrg } from "@/lib/ownership";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";

  const where: Record<string, unknown> = { organizationId: orgId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { assetTag: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) {
    where.status = status;
  }
  if (categoryId) {
    where.categoryId = categoryId;
  }

  const assets = await prisma.asset.findMany({
    where: where as any,
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;

  const body = await req.json();
  const parsed = assetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // facilityId / categoryId come from the body — each must belong to the
  // caller's org.
  if (!(await facilityInOrg(parsed.data.facilityId, orgId))) {
    return NextResponse.json({ error: "Facility not found" }, { status: 404 });
  }
  if (!(await categoryInOrg(parsed.data.categoryId, orgId))) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const asset = await prisma.asset.create({
    data: {
      ...parsed.data,
      organizationId: orgId,
    },
    include: { category: true },
  });

  logAudit({
    action: "asset.create",
    entityType: "Asset",
    entityId: asset.id,
    userId: session.user.id,
    organizationId: orgId,
    metadata: { assetTag: asset.assetTag, name: asset.name },
  });

  return NextResponse.json(asset, { status: 201 });
}
