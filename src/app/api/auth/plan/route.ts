import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { isStoreProvisioning } from "@/lib/provision-secret";
import {
  pickUserByEmail,
  planActionForStatus,
  planResponseAction,
  provisionedMembership,
} from "@/lib/billing-lock";

/**
 * POST /api/auth/plan — the PF9 store saying a Stripe subscription changed
 * (2026-11-14). Without it a customer could start a trial, cancel, and keep
 * using the app forever: the store only updated its own records.
 *
 * Body: { email, status, product?, stripeSubscriptionId? }. product and
 * stripeSubscriptionId are informational only and never used for scoping.
 *
 * canceled / cancelled / unpaid / incomplete_expired -> lock the organization
 * the store provisioned for `email` (lib/billing-lock). active / trialing ->
 * unlock it. Anything else -> no change. Only Organization.billingLockedAt is
 * written; the lock is enforced in lib/auth.ts (jwt callback + authorize) and
 * lib/api-auth.ts. Repeating a call is harmless.
 *
 * Public path (proxy lets /api/auth/* through) but only the store holding the
 * shared secret gets past the first line. Unlike register there is NO
 * public/non-production bypass: an unconfigured secret refuses everything.
 */
const planSchema = z.object({
  email: z.string().trim().min(1).max(320),
  status: z.string().max(64).nullish(),
  product: z.unknown().optional(),
  stripeSubscriptionId: z.unknown().optional(),
});

function info(v: unknown): string | null {
  return typeof v === "string" ? v.slice(0, 200) : null;
}

export async function POST(req: Request) {
  // Secret first — before the body or the database. Same helper and the same
  // 403 as the register route (which also answers 403 when no secret is set).
  if (!isStoreProvisioning(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email } = parsed.data;
  const status = (parsed.data.status ?? "").trim().toLowerCase();
  const action = planActionForStatus(status);
  if (action === "none") {
    return NextResponse.json({ ok: true, action: "none", reason: "status_not_actionable" });
  }

  try {
    // Case-insensitive candidates; pickUserByEmail re-checks each one exactly.
    const candidates = await prisma.user.findMany({
      where: { email: { equals: email, mode: "insensitive" } },
      select: {
        id: true,
        email: true,
        memberships: { select: { organizationId: true, role: true, createdAt: true } },
      },
      take: 50,
    });
    const user = pickUserByEmail(candidates, email);
    if (!user) {
      return NextResponse.json({ ok: true, action: "none", reason: "no_account" });
    }
    const owned = provisionedMembership(user.memberships);
    if (!owned) {
      return NextResponse.json({ ok: true, action: "none", reason: "no_owned_organization" });
    }
    const organizationId = owned.organizationId;

    // Conditional updates: atomic and idempotent. A repeat matches 0 rows and
    // keeps the original lock time.
    const result =
      action === "lock"
        ? await prisma.organization.updateMany({
            where: { id: organizationId, billingLockedAt: null },
            data: { billingLockedAt: new Date() },
          })
        : await prisma.organization.updateMany({
            where: { id: organizationId, NOT: { billingLockedAt: null } },
            data: { billingLockedAt: null },
          });
    const changed = result.count > 0;

    if (changed) {
      logAudit({
        action: action === "lock" ? "organization.billing_locked" : "organization.billing_unlocked",
        entityType: "Organization",
        entityId: organizationId,
        organizationId,
        metadata: {
          by: "store",
          status,
          product: info(parsed.data.product),
          stripeSubscriptionId: info(parsed.data.stripeSubscriptionId),
        },
      });
    }

    const members = await prisma.membership.count({ where: { organizationId } });

    return NextResponse.json({
      ok: true,
      action: planResponseAction(action),
      changed,
      organizationId,
      members,
    });
  } catch (error) {
    console.error("Plan change error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
