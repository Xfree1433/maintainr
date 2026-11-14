/**
 * Billing lock: the PF9 store tells the app a subscription changed
 * (POST /api/auth/plan), and the app locks or unlocks the ORGANIZATION the
 * store provisioned for that customer. 2026-11-14.
 *
 * The lock is one column, Organization.billingLockedAt. Nothing per-user is
 * touched, so unlocking can never re-enable a member an admin removed.
 *
 * Pure on purpose (no Prisma, no Next): the tests import this file directly,
 * and auth.ts / the plan route call it so the decisions live in one place.
 */

export type PlanAction = "lock" | "unlock" | "none";

/** Stripe has ended the subscription (or given up collecting on it). */
const LOCK_STATUSES = new Set(["canceled", "cancelled", "unpaid", "incomplete_expired"]);
/** Stripe says the subscription is good. */
const UNLOCK_STATUSES = new Set(["active", "trialing"]);

/**
 * Stripe subscription status -> what to do. Anything not listed (past_due,
 * incomplete, paused, empty, unknown, not a string) changes nothing: a first
 * failed payment does not lock; Stripe giving up (`unpaid`) does.
 */
export function planActionForStatus(status: unknown): PlanAction {
  if (typeof status !== "string") return "none";
  const s = status.trim().toLowerCase();
  if (LOCK_STATUSES.has(s)) return "lock";
  if (UNLOCK_STATUSES.has(s)) return "unlock";
  return "none";
}

/** The response word for an action. */
export function planResponseAction(action: PlanAction): "locked" | "unlocked" | "none" {
  return action === "lock" ? "locked" : action === "unlock" ? "unlocked" : "none";
}

export interface LockableOrganization {
  billingLockedAt: Date | null;
}

export function isBillingLocked(org: LockableOrganization): boolean {
  return org.billingLockedAt != null;
}

/**
 * The membership a session should use: the first one, in the order the caller
 * queried them, whose organization is NOT billing-locked. A member of a locked
 * organization and an unlocked one keeps the unlocked one; a member of only
 * locked organizations gets null (= no organization = not signed in).
 */
export function chooseActiveMembership<T extends { organization: LockableOrganization }>(
  memberships: readonly T[]
): T | null {
  return memberships.find((m) => !isBillingLocked(m.organization)) ?? null;
}

/**
 * Credentials sign-in is refused when the user belongs to organizations and
 * EVERY one of them is billing-locked, so they get the normal "invalid" error.
 * A user with no membership at all is left exactly as before this change.
 */
export function signInBlockedByBillingLock(
  memberships: readonly { organization: LockableOrganization }[]
): boolean {
  return memberships.length > 0 && chooseActiveMembership(memberships) === null;
}

/**
 * The account the store means. Emails are stored as the register route got
 * them (not lower-cased), and the lookup is case-insensitive, so: an exact
 * match wins; otherwise exactly one case-insensitive match; anything else
 * (none, or ambiguous) is null and the route changes nothing.
 * The candidates may come from a loose DB filter; this re-checks every one.
 */
export function pickUserByEmail<T extends { email: string }>(
  candidates: readonly T[],
  email: string
): T | null {
  const exact = candidates.find((c) => c.email === email);
  if (exact) return exact;
  const want = email.toLowerCase();
  const matches = candidates.filter((c) => c.email.toLowerCase() === want);
  return matches.length === 1 ? matches[0] : null;
}

/**
 * The organization the store provisioned for this user. The register route
 * creates the user, the organization and an OWNER membership in one
 * transaction (and refuses an email that already exists), so it is the user's
 * oldest OWNER membership. A user who owns nothing gets null.
 */
export function provisionedMembership<T extends { role: string; createdAt: Date }>(
  memberships: readonly T[]
): T | null {
  let best: T | null = null;
  for (const m of memberships) {
    if (m.role !== "OWNER") continue;
    if (!best || m.createdAt.getTime() < best.createdAt.getTime()) best = m;
  }
  return best;
}
