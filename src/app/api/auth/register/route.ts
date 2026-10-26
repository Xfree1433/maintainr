import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { captureServer, identifyServer } from "@/lib/posthog";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2),
});

function publicRegistrationAllowed(): boolean {
  if (process.env.ALLOW_PUBLIC_REGISTRATION === "true") return true;
  return process.env.NODE_ENV !== "production";
}

/**
 * Security audit 2026-10-26: this route had no gate, so anyone could POST here
 * and get a paid OWNER account, or pre-register a buyer's email so the real
 * purchase hit 409. Same contract as FLOWTRACK: in production only the PF9
 * store, presenting the shared secret, can register. Fails closed: no
 * PROVISION_SECRET configured means no bypass exists.
 */
function isStoreProvisioning(req: Request): boolean {
  const secret = process.env.PROVISION_SECRET;
  if (!secret) return false;
  const presented = req.headers.get("x-pf9-provision-secret");
  if (!presented) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!publicRegistrationAllowed() && !isStoreProvisioning(req)) {
    return NextResponse.json(
      {
        error:
          "Registration is by subscription only. Contact sales to get started.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password, organizationName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, hashedPassword },
      });

      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug: `${slug}-${user.id.slice(0, 6)}`,
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "OWNER",
        },
      });

      return { userId: user.id, organizationId: organization.id };
    });

    // Analytics: signup. distinctId = email to stitch with the storefront journey.
    await identifyServer(email, {
      email,
      name,
      signup_app: "maintainr",
      organization: organizationName,
    });
    await captureServer(
      "app_signup",
      email,
      { email, organization: organizationName },
      { account: result.organizationId }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
