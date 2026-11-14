/**
 * Lower-priority audit fixes, 2026-11-14 (board #1043).
 *
 * Pure helpers (connector secret masking, audit-log paging) are tested
 * directly. Route handlers cannot be imported without Next and a database, so
 * their guards and wiring are checked at source level (same approach as
 * billing-lock.test.mts).
 *
 * Run: npx tsx --test tests/lower-fixes.test.mts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const read = (p: string) => readFileSync(join(root, p), "utf8");

const { parseTakeSkip } = await import("../src/lib/validators.js");
const secretsPath = join(root, "src/lib/connector-secrets.ts");
const secrets = existsSync(secretsPath) ? await import("../src/lib/connector-secrets.js") : null;

function handler(src: string, method: string): string {
  const start = src.indexOf(`export async function ${method}(`);
  assert.ok(start >= 0, `${method} handler not found`);
  const next = src.indexOf("export async function", start + 1);
  return src.slice(start, next < 0 ? undefined : next);
}

// ─── health ──────────────────────────────────────────────────────────

test("health: no migration name or DB error text reaches anonymous callers", () => {
  const src = read("src/app/api/health/route.ts");
  assert.ok(!src.includes("migration_name"), "migration name is still queried");
  assert.ok(!/latest/.test(src), "migrations.latest is still returned");
  assert.ok(!/error:\s*msg/.test(src), "raw error text is still returned");
  assert.match(src, /status: "ok", database: "connected", migrations/);
  assert.match(src, /status: "degraded", database: "error"/);
  assert.match(src, /console\.error\(/, "failure detail must be logged server-side");
});

// ─── connector secret masking ────────────────────────────────────────

test("connectors: secret-looking config fields are masked", () => {
  assert.ok(secrets, "src/lib/connector-secrets.ts missing");
  const { maskConnector, SECRET_MASK } = secrets!;
  const stored = JSON.stringify({
    host: "db.example.com",
    port: "5432",
    database: "cmms",
    username: "svc",
    password: "hunter2",
    apiKey: "sk_live_abcdefghijklmnop",
    clientSecret: "s3cr3t-value-123456",
    token: "tok",
    key: "k",
    url: "postgres://svc:hunter2@db.example.com/cmms",
    nested: { dbPassword: "p@ss" },
  });
  const out = JSON.parse(maskConnector({ id: "c1", config: stored }).config);
  assert.equal(out.host, "db.example.com");
  assert.equal(out.username, "svc");
  assert.equal(out.password, SECRET_MASK);
  assert.equal(out.apiKey, SECRET_MASK + "mnop");
  assert.equal(out.clientSecret, SECRET_MASK + "3456");
  assert.equal(out.token, SECRET_MASK);
  assert.equal(out.key, SECRET_MASK);
  assert.equal(out.url, `postgres://svc:${SECRET_MASK}@db.example.com/cmms`);
  assert.equal(out.nested.dbPassword, SECRET_MASK);
  assert.ok(!JSON.stringify(out).includes("hunter2"));
});

test("connectors: null config stays null; junk config becomes {}", () => {
  assert.ok(secrets);
  assert.equal(secrets!.maskConnector({ config: null }).config, null);
  assert.equal(secrets!.maskConnector({ config: "not json" }).config, "{}");
});

test("connectors: a masked value sent back on update keeps the stored secret", () => {
  assert.ok(secrets);
  const { maskConnectorConfig, restoreMaskedSecrets } = secrets!;
  const stored = JSON.stringify({
    host: "old-host",
    password: "hunter2",
    apiKey: "sk_live_abcdefghijklmnop",
    url: "postgres://svc:hunter2@db/cmms",
    nested: { dbPassword: "p@ss" },
  });
  // Client round-trips the masked read, changing only the host.
  const roundTrip = JSON.parse(maskConnectorConfig(stored)!);
  roundTrip.host = "new-host";
  const saved = JSON.parse(restoreMaskedSecrets(JSON.stringify(roundTrip), stored));
  assert.deepEqual(saved, {
    host: "new-host",
    password: "hunter2",
    apiKey: "sk_live_abcdefghijklmnop",
    url: "postgres://svc:hunter2@db/cmms",
    nested: { dbPassword: "p@ss" },
  });
  // A genuinely new secret replaces the old one.
  const changed = JSON.parse(restoreMaskedSecrets(JSON.stringify({ password: "new-pw" }), stored));
  assert.equal(changed.password, "new-pw");
  // Nothing stored yet: incoming is kept as-is.
  assert.equal(restoreMaskedSecrets('{"password":"x"}', null), '{"password":"x"}');
});

test("connectors: every route response is masked and PUT restores masked secrets", () => {
  const list = read("src/app/api/connectors/route.ts");
  assert.match(handler(list, "GET"), /connectors: connectors\.map\(maskConnector\)/);
  assert.match(handler(list, "POST"), /connector: maskConnector\(connector\)/);
  const one = read("src/app/api/connectors/[id]/route.ts");
  assert.match(handler(one, "GET"), /connector: maskConnector\(connector\)/);
  const put = handler(one, "PUT");
  assert.match(put, /connector: maskConnector\(connector\)/);
  assert.match(put, /restoreMaskedSecrets\(data\.config, existing\.config\)/);
  assert.ok(put.indexOf("restoreMaskedSecrets") < put.indexOf("connector.update"));
  // No bare `{ connector }` / `{ connectors }` response left anywhere.
  assert.ok(!/NextResponse\.json\(\{ connectors? \}/.test(list + one));
});

// ─── OPERATOR role checks ────────────────────────────────────────────

const OPERATOR_403 =
  /prisma\.membership\.findFirst\(\{\s*where: \{ userId: session\.user\.id, organizationId: orgId \},\s*select: \{ role: true \},?\s*\}\);\s*if \(!membership \|\| membership\.role === "OPERATOR"\) \{\s*return NextResponse\.json\(\{ error: "Forbidden" \}, \{ status: 403 \}\)/;

const guarded: [string, string][] = [
  ["src/app/api/assets/[id]/route.ts", "DELETE"],
  ["src/app/api/parts/[id]/route.ts", "DELETE"],
  ["src/app/api/schedules/[id]/route.ts", "DELETE"],
  ["src/app/api/technicians/[id]/route.ts", "DELETE"],
  ["src/app/api/work-orders/[id]/route.ts", "DELETE"],
  ["src/app/api/connectors/[id]/route.ts", "DELETE"],
  ["src/app/api/connectors/[id]/route.ts", "PUT"],
  ["src/app/api/connectors/route.ts", "POST"],
];

for (const [file, method] of guarded) {
  test(`roles: OPERATOR gets 403 on ${method} ${file.replace("src/app", "").replace("/route.ts", "")}`, () => {
    const body = handler(read(file), method);
    const guard = body.search(OPERATOR_403);
    assert.ok(guard >= 0, "no OPERATOR 403 guard");
    // It must be the first DB call: before the lookup, update or delete.
    assert.equal(body.indexOf("prisma."), body.indexOf("prisma.membership.findFirst"));
  });
}

test("roles: every DELETE route in the API is guarded", async () => {
  const { readdirSync, statSync } = await import("node:fs");
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : n === "route.ts" ? [p] : [];
    });
  const withDelete = walk(join(root, "src/app/api")).filter((p) =>
    readFileSync(p, "utf8").includes("export async function DELETE("),
  );
  assert.ok(withDelete.length >= 6, `only ${withDelete.length} DELETE routes found`);
  for (const p of withDelete) {
    assert.ok(OPERATOR_403.test(handler(readFileSync(p, "utf8"), "DELETE")), p);
  }
});

// ─── audit-log paging ────────────────────────────────────────────────

test("audit-log: take clamped to 1..100, skip >= 0, non-numbers rejected", () => {
  assert.deepEqual(parseTakeSkip(null, null), { take: 50, skip: 0 });
  assert.deepEqual(parseTakeSkip("", ""), { take: 50, skip: 0 });
  assert.deepEqual(parseTakeSkip("25", "50"), { take: 25, skip: 50 });
  assert.deepEqual(parseTakeSkip("100000", "0"), { take: 100, skip: 0 });
  assert.deepEqual(parseTakeSkip("0", "-10"), { take: 1, skip: 0 });
  assert.deepEqual(parseTakeSkip("-5", "3"), { take: 1, skip: 3 });
  assert.equal(parseTakeSkip("abc", "0"), null);
  assert.equal(parseTakeSkip("10", "xyz"), null);
  assert.equal(parseTakeSkip("1.5", "0"), null);
  assert.equal(parseTakeSkip("12abc", "0"), null);
});

test("audit-log route uses the helper and answers 400 on bad input", () => {
  const body = handler(read("src/app/api/audit-log/route.ts"), "GET");
  assert.match(body, /parseTakeSkip\(searchParams\.get\("take"\), searchParams\.get\("skip"\)\)/);
  assert.match(body, /\{ status: 400 \}/);
  assert.ok(!/parseInt\(searchParams\.get\("take"\)/.test(body));
});
