import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { profileUpdateSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true },
  });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
    select: { role: true },
  });

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, slug: true, plan: true },
  });

  return NextResponse.json({
    user,
    role: membership?.role ?? null,
    organization,
  });
}

// GAP-03: editable settings. Users may rename themselves; OWNER/ADMIN may also
// rename the organization. Returns the refreshed profile payload.
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;

  const body = await req.json().catch(() => ({}));
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
    select: { role: true },
  });
  const role = membership?.role ?? null;
  const canEditOrg = role === "OWNER" || role === "ADMIN";

  if (parsed.data.organizationName !== undefined && !canEditOrg) {
    return NextResponse.json(
      { error: "Only an owner or admin can rename the organization." },
      { status: 403 }
    );
  }

  if (parsed.data.name !== undefined) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.data.name },
    });
  }

  if (parsed.data.organizationName !== undefined && canEditOrg) {
    await prisma.organization.update({
      where: { id: orgId },
      data: { name: parsed.data.organizationName },
    });
  }

  logAudit({
    action: "profile.update",
    entityType: "User",
    entityId: session.user.id,
    userId: session.user.id,
    organizationId: orgId,
    metadata: { fields: Object.keys(parsed.data) },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true },
  });
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, slug: true, plan: true },
  });

  return NextResponse.json({ user, role, organization });
}
