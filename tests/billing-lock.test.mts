/**
 * The store's "subscription changed" route, POST /api/auth/plan (2026-11-14).
 *
 * The decisions are pure functions in src/lib/billing-lock.ts and the secret
 * check is src/lib/provision-secret.ts; both are tested directly here. The
 * route and auth.ts cannot be imported without Next and a database, so the
 * wiring is checked at source level (same approach as SHIFTLOG's
 * tests/org-less-session.test.mts). The end-to-end path is verified live after deploy.
 *
 * Every test here fails on the pre-change code (the modules, route and
 * migration do not exist there).
 *
 * Run: npx tsx --test tests/billing-lock.test.mts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const read = (p: string) => readFileSync(join(root, p), "utf8");

const {
  planActionForStatus,
  planResponseAction,
  chooseActiveMembership,
  signInBlockedByBillingLock,
  pickUserByEmail,
  provisionedMembership,
  isBillingLocked,
} = await import("../src/lib/billing-lock.js");
const { isStoreProvisioning } = await import("../src/lib/provision-secret.js");

// ─── status -> action ────────────────────────────────────────────────

test("status: canceled / cancelled / unpaid / incomplete_expired lock", () => {
  for (const s of ["canceled", "cancelled", "unpaid", "incomplete_expired", " Canceled ", "UNPAID"]) {
    assert.equal(planActionForStatus(s), "lock", s);
  }
});

test("status: active / trialing unlock", () => {
  for (const s of ["active", "trialing", " Active", "TRIALING "]) {
    assert.equal(planActionForStatus(s), "unlock", s);
  }
});

test("status: past_due, incomplete, paused, empty, unknown and non-strings change nothing", () => {
  for (const s of ["past_due", "incomplete", "paused", "", "   ", "deleted", "cancel", "activ", null, undefined, 1, {}]) {
    assert.equal(planActionForStatus(s), "none", String(s));
  }
});

test("response words", () => {
  assert.equal(planResponseAction("lock"), "locked");
  assert.equal(planResponseAction("unlock"), "unlocked");
  assert.equal(planResponseAction("none"), "none");
});

// ─── the secret (shared with register) ───────────────────────────────

function req(headers: Record<string, string>) {
  return new Request("http://x/api/auth/plan", { method: "POST", headers });
}

test("secret: not configured -> refused, whatever is presented", () => {
  const saved = process.env.PROVISION_SECRET;
  try {
    delete process.env.PROVISION_SECRET;
    assert.equal(isStoreProvisioning(req({ "x-pf9-provision-secret": "anything" })), false);
    assert.equal(isStoreProvisioning(req({ "x-pf9-provision-secret": "" })), false);
    process.env.PROVISION_SECRET = "";
    assert.equal(isStoreProvisioning(req({ "x-pf9-provision-secret": "" })), false);
  } finally {
    if (saved === undefined) delete process.env.PROVISION_SECRET;
    else process.env.PROVISION_SECRET = saved;
  }
});

test("secret: missing, wrong, or wrong-length header -> refused; exact -> accepted", () => {
  const saved = process.env.PROVISION_SECRET;
  try {
    process.env.PROVISION_SECRET = "s3cret-value";
    assert.equal(isStoreProvisioning(req({})), false);
    assert.equal(isStoreProvisioning(req({ "x-pf9-provision-secret": "s3cret-valuX" })), false);
    assert.equal(isStoreProvisioning(req({ "x-pf9-provision-secret": "s3cret" })), false);
    assert.equal(isStoreProvisioning(req({ "x-pf9-provision-secret": "s3cret-value-and-more" })), false);
    assert.equal(isStoreProvisioning(req({ "X-PF9-Provision-Secret": "s3cret-value" })), true);
  } finally {
    if (saved === undefined) delete process.env.PROVISION_SECRET;
    else process.env.PROVISION_SECRET = saved;
  }
});

// ─── finding the account and the organization ────────────────────────

test("email: exact match wins, else exactly one case-insensitive match", () => {
  const a = { id: "a", email: "Owner@Example.com" };
  const b = { id: "b", email: "owner@example.com" };
  assert.equal(pickUserByEmail([a, b], "owner@example.com")?.id, "b");
  assert.equal(pickUserByEmail([a], "OWNER@EXAMPLE.COM")?.id, "a");
  // Two case-variants and neither exact: ambiguous -> no change.
  assert.equal(pickUserByEmail([a, b], "OWNER@example.COM"), null);
  assert.equal(pickUserByEmail([], "owner@example.com"), null);
});

test("email: a loose DB match (e.g. '_' as a wildcard) is never accepted", () => {
  const other = { id: "x", email: "johnXdoe@example.com" };
  assert.equal(pickUserByEmail([other], "john_doe@example.com"), null);
});

test("organization: the user's oldest OWNER membership; members and admins own nothing", () => {
  const t = (n: number) => new Date(2026, 0, n);
  const ms = [
    { organizationId: "later-owned", role: "OWNER", createdAt: t(5) },
    { organizationId: "member-of", role: "OPERATOR", createdAt: t(1) },
    { organizationId: "provisioned", role: "OWNER", createdAt: t(2) },
    { organizationId: "admin-of", role: "ADMIN", createdAt: t(0) },
  ];
  assert.equal(provisionedMembership(ms)?.organizationId, "provisioned");
  assert.equal(provisionedMembership(ms.filter((m) => m.role !== "OWNER")), null);
  assert.equal(provisionedMembership([]), null);
});

// ─── which organization a session gets ───────────────────────────────

type M = { organizationId: string; organization: { billingLockedAt: Date | null } };
const m = (id: string, locked: boolean): M => ({
  organizationId: id,
  organization: { billingLockedAt: locked ? new Date() : null },
});

test("active membership: first unlocked one in the caller's order", () => {
  assert.equal(chooseActiveMembership([m("A", false)])?.organizationId, "A");
  assert.equal(chooseActiveMembership([m("A", true)]), null);
  assert.equal(chooseActiveMembership([m("A", true), m("B", false)])?.organizationId, "B");
  assert.equal(chooseActiveMembership([m("A", false), m("B", false)])?.organizationId, "A");
  assert.equal(chooseActiveMembership([m("A", true), m("B", true)]), null);
  assert.equal(chooseActiveMembership([]), null);
  assert.equal(isBillingLocked({ billingLockedAt: null }), false);
  assert.equal(isBillingLocked({ billingLockedAt: new Date(0) }), true);
});

test("sign-in: refused only when every organization is locked; org-less users unchanged", () => {
  assert.equal(signInBlockedByBillingLock([m("A", true)]), true);
  assert.equal(signInBlockedByBillingLock([m("A", true), m("B", true)]), true);
  assert.equal(signInBlockedByBillingLock([m("A", true), m("B", false)]), false);
  assert.equal(signInBlockedByBillingLock([m("A", false)]), false);
  assert.equal(signInBlockedByBillingLock([]), false);
});

/**
 * The spec's scenarios, run through the same functions the route and the jwt
 * callback use, against an in-memory copy of the tables. "session ok" means
 * the jwt callback would put an organization on the token, which is what
 * makes session.user.id (and so every API route) available.
 */
test("scenario: cancel locks org A for owner and member, B and a two-org user keep access; unlock restores; a removed member stays out", () => {
  const orgs: Record<string, { billingLockedAt: Date | null }> = {
    A: { billingLockedAt: null },
    B: { billingLockedAt: null },
  };
  const t = (n: number) => new Date(2026, 0, n);
  let memberships = [
    { userId: "owner", organizationId: "A", role: "OWNER", createdAt: t(1) },
    { userId: "member", organizationId: "A", role: "OPERATOR", createdAt: t(2) },
    { userId: "both", organizationId: "A", role: "MANAGER", createdAt: t(3) },
    { userId: "both", organizationId: "B", role: "OPERATOR", createdAt: t(4) },
    { userId: "removed", organizationId: "A", role: "OPERATOR", createdAt: t(5) },
    { userId: "ownerB", organizationId: "B", role: "OWNER", createdAt: t(0) },
  ];
  const users = [
    { id: "owner", email: "owner@a.test" },
    { id: "ownerB", email: "owner@b.test" },
    { id: "member", email: "member@a.test" },
  ];
  const ofUser = (u: string) =>
    memberships
      .filter((x) => x.userId === u)
      .sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime())
      .map((x) => ({ ...x, organization: orgs[x.organizationId] }));
  const sessionOrg = (u: string) => chooseActiveMembership(ofUser(u))?.organizationId ?? null;
  const canSignIn = (u: string) => !signInBlockedByBillingLock(ofUser(u));

  // The route: find the user, find what they own, flip only that flag.
  function plan(email: string, status: string) {
    const action = planActionForStatus(status);
    if (action === "none") return { action: "none" as const, changed: false };
    const user = pickUserByEmail(users, email);
    const owned = user && provisionedMembership(ofUser(user.id));
    if (!owned) return { action: "none" as const, changed: false };
    const org = orgs[owned.organizationId];
    const before = org.billingLockedAt;
    if (action === "lock" && before === null) org.billingLockedAt = new Date();
    if (action === "unlock" && before !== null) org.billingLockedAt = null;
    return { action: planResponseAction(action), changed: before !== org.billingLockedAt };
  }

  // An admin removes a member BEFORE the lock (the only way these apps switch
  // a user off: the membership row goes).
  memberships = memberships.filter((x) => x.userId !== "removed");

  // past_due and an unknown email: nothing changes.
  assert.deepEqual(plan("owner@a.test", "past_due"), { action: "none", changed: false });
  assert.deepEqual(plan("nobody@a.test", "canceled"), { action: "none", changed: false });
  // A plain member owns nothing: their email never locks the org.
  assert.deepEqual(plan("member@a.test", "canceled"), { action: "none", changed: false });
  assert.equal(orgs.A.billingLockedAt, null);

  // Cancel.
  assert.deepEqual(plan("OWNER@a.test", "canceled"), { action: "locked", changed: true });
  const lockedAt = orgs.A.billingLockedAt;
  assert.equal(sessionOrg("owner"), null); // already-signed-in owner: next request refused
  assert.equal(sessionOrg("member"), null); // already-signed-in member: same
  assert.equal(canSignIn("owner"), false); // and neither can sign in again
  assert.equal(canSignIn("member"), false);
  assert.equal(sessionOrg("both"), "B"); // two-org user keeps the unlocked org
  assert.equal(canSignIn("both"), true);
  assert.equal(sessionOrg("ownerB"), "B"); // other organization untouched
  assert.equal(orgs.B.billingLockedAt, null);

  // Repeat lock: harmless, same action, original lock time kept.
  assert.deepEqual(plan("owner@a.test", "cancelled"), { action: "locked", changed: false });
  assert.equal(orgs.A.billingLockedAt, lockedAt);

  // Unlock.
  assert.deepEqual(plan("owner@a.test", "active"), { action: "unlocked", changed: true });
  assert.equal(sessionOrg("owner"), "A");
  assert.equal(sessionOrg("member"), "A");
  assert.equal(sessionOrg("both"), "A"); // back to organization A
  assert.equal(sessionOrg("removed"), null); // removed before the lock: still out
  assert.equal(canSignIn("owner"), true);

  // Repeat unlock: harmless.
  assert.deepEqual(plan("owner@a.test", "trialing"), { action: "unlocked", changed: false });
  assert.equal(orgs.A.billingLockedAt, null);
});

// ─── wiring (source level) ───────────────────────────────────────────

function block(src: string, start: string): string {
  const i = src.indexOf(start);
  assert.notEqual(i, -1, `missing ${start}`);
  let depth = 0;
  for (let j = src.indexOf(") {", i) + 2; j < src.length; j++) {
    if (src[j] === "{") depth++;
    if (src[j] === "}" && --depth === 0) return src.slice(i, j + 1);
  }
  throw new Error("unbalanced");
}

const ROUTE = "src/app/api/auth/plan/route.ts";

test("route: lives at /api/auth/plan, which the proxy lets through without a session", () => {
  assert.ok(existsSync(join(root, ROUTE)), "route file missing");
  assert.match(read("src/lib/auth.config.ts"), /pathname\.startsWith\("\/api\/auth"\)/);
  assert.match(read(ROUTE), /export async function POST\(/);
});

test("route: checks the shared secret before reading the body or the database", () => {
  const src = read(ROUTE);
  const post = src.slice(src.indexOf("export async function POST("));
  const gate = post.indexOf("if (!isStoreProvisioning(req))");
  assert.notEqual(gate, -1);
  assert.ok(gate < post.indexOf("req.json()"), "body read before the secret check");
  assert.ok(gate < post.indexOf("prisma."), "database touched before the secret check");
  assert.match(post.slice(gate, post.indexOf("\n  }", gate)), /status: 403/);
  assert.match(src, /from "@\/lib\/provision-secret"/);
  // Register uses the same helper, and no longer has a private copy.
  const reg = read("src/app/api/auth/register/route.ts");
  assert.match(reg, /import \{ isStoreProvisioning \} from "@\/lib\/provision-secret"/);
  assert.equal(/function isStoreProvisioning/.test(reg), false);
  assert.equal(/timingSafeEqual/.test(reg), false);
});

test("route: decisions come from lib/billing-lock; it only ever writes billingLockedAt", () => {
  const src = read(ROUTE);
  for (const fn of ["planActionForStatus", "pickUserByEmail", "provisionedMembership", "planResponseAction"]) {
    assert.match(src, new RegExp(`${fn}\\(`), fn);
  }
  // Writes: exactly the two conditional organization updates, nothing else.
  const writes = src.match(/prisma\.\w+\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(/g) ?? [];
  assert.deepEqual(writes, ["prisma.organization.updateMany(", "prisma.organization.updateMany("]);
  const datas = src.match(/\bdata: \{[^}]*\}/g) ?? [];
  assert.equal(datas.length, 2);
  for (const d of datas) assert.match(d, /^data: \{ billingLockedAt: (new Date\(\)|null) \}$/);
  // Idempotent: lock only matches unlocked rows, unlock only locked ones.
  assert.match(src, /where: \{ id: organizationId, billingLockedAt: null \}/);
  assert.match(src, /where: \{ id: organizationId, NOT: \{ billingLockedAt: null \} \}/);
  // Audit trail, recorded as the store.
  assert.match(src, /logAudit\(/);
  assert.match(src, /by: "store"/);
});

test("auth: jwt callback skips locked organizations; authorize refuses all-locked users", () => {
  const auth = read("src/lib/auth.ts");
  const jwt = block(auth, "async jwt(");
  assert.match(jwt, /chooseActiveMembership\(memberships\)/);
  assert.match(jwt, /billingLockedAt: true/);
  // MAINTAINR keeps its existing newest-first order (unchanged by this work).
  assert.match(jwt, /orderBy: \{ createdAt: "desc" \}/);
  assert.match(jwt, /delete token\.organizationId/);
  const authorize = block(auth, "async authorize(");
  const refuse = authorize.indexOf("if (signInBlockedByBillingLock(memberships)) return null;");
  assert.notEqual(refuse, -1);
  assert.ok(refuse < authorize.lastIndexOf("return {"), "lock check must come before the user is returned");
  // Session still only carries a user id when there is an organization.
  const session = block(auth, "async session(");
  assert.match(session, /if \(token\.organizationId\) \{\s*session\.user\.id = /);
});

test("api keys: a locked organization's keys are refused", () => {
  const src = read("src/lib/api-auth.ts");
  assert.match(src, /billingLockedAt: true/);
  assert.match(src, /if \(isBillingLocked\(apiKey\.organization\)\)/);
});

test("schema: nullable Organization.billingLockedAt plus an idempotent raw-SQL migration", () => {
  const schema = read("prisma/schema.prisma");
  const org = schema.slice(schema.indexOf("model Organization {"));
  assert.match(org.slice(0, org.indexOf("\n}")), /\n  billingLockedAt DateTime\?\n/);
  const dirs = readdirSync(join(root, "prisma/migrations")).filter((d) => /^\d{14}_/.test(d));
  const dir = dirs.find((d) => d.endsWith("_add_organization_billing_lock"));
  assert.ok(dir, "migration folder missing");
  const sql = read(`prisma/migrations/${dir}/migration.sql`);
  assert.match(sql, /ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "billingLockedAt" TIMESTAMP\(3\);/);
  // Nothing destructive in it.
  assert.equal(/\b(DROP|DELETE|TRUNCATE|UPDATE)\b/i.test(sql.replace(/--.*$/gm, "")), false);
  // Sorts after every existing migration, so a replay applies it last.
  assert.equal(dirs.sort().at(-1), dir);
});
