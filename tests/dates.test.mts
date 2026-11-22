/**
 * Picked days stay that day; "now" in a datetime field is local (2026-11-22).
 *
 * Run: TZ=America/Chicago npx tsx --test tests/dates.test.mts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

process.env.TZ = "America/Chicago";
const { dayKey, formatDay, isPastDay, localToday, localDateTimeInput, startOfAppToday } =
  await import("../src/lib/dates.js");
const root = new URL("..", import.meta.url).pathname;
const read = (p: string) => readFileSync(join(root, p), "utf8");

const due = "2026-11-22T00:00:00.000Z";            // a job due Nov 22

test("a picked day is shown as that day, not the day before", () => {
  assert.equal(dayKey(due), "2026-11-22");
  assert.match(formatDay(due), /22/);
  assert.doesNotMatch(formatDay(due), /21/);
});

test("a job is overdue the day after it was due, on the viewer's clock", () => {
  assert.equal(isPastDay(due, new Date("2026-11-22T00:30:00Z")), false);   // 6:30 pm on the 21st, Central
  assert.equal(isPastDay(due, new Date("2026-11-22T18:00:00Z")), false);   // noon on the 22nd
  assert.equal(isPastDay(due, new Date("2026-11-23T05:59:00Z")), false);   // 11:59 pm on the 22nd
  assert.equal(isPastDay(due, new Date("2026-11-23T06:01:00Z")), true);    // 12:01 am on the 23rd
});

test("the datetime field is pre-filled with local time, not UTC", () => {
  const now = new Date("2026-11-22T20:46:00Z");                            // 2:46 pm Central
  assert.equal(localDateTimeInput(now), "2026-11-22T14:46");
  assert.equal(localToday(new Date("2026-11-23T02:00:00Z")), "2026-11-22"); // 8 pm on the 22nd
  // Round trip the way the downtime form sends it: back to the same instant.
  assert.equal(new Date(localDateTimeInput(now)).toISOString(), "2026-11-22T20:46:00.000Z");
});

test("server-side overdue cutoff is the start of today in the app timezone", () => {
  assert.equal(startOfAppToday(new Date("2026-11-23T02:00:00Z")).toISOString(), "2026-11-22T00:00:00.000Z");
  assert.equal(startOfAppToday(new Date("2026-11-23T07:00:00Z")).toISOString(), "2026-11-23T00:00:00.000Z");
  assert.equal(startOfAppToday(new Date("2026-11-23T02:00:00Z"), "UTC").toISOString(), "2026-11-23T00:00:00.000Z");
  assert.equal(startOfAppToday(new Date("2026-11-23T02:00:00Z"), "Not/AZone").toISOString(), "2026-11-22T00:00:00.000Z");
});

test("pages use the helpers for date-only fields", () => {
  const pages = ["schedules/page.tsx", "assets/[id]/page.tsx", "work-orders/page.tsx", "work-orders/[id]/page.tsx"];
  for (const p of pages) {
    const src = read(`src/app/(dashboard)/${p}`);
    assert.doesNotMatch(src, /new Date\((s\.nextDue|wo\.dueDate|workOrder\.dueDate|asset\.installDate|asset\.warrantyExpiry)\)\.toLocaleDateString/, p);
    assert.doesNotMatch(src, /new Date\(s\.nextDue\) < new Date\(\)/, p);
  }
  assert.doesNotMatch(read("src/app/(dashboard)/downtime/page.tsx"), /startedAt: new Date\(\)\.toISOString\(\)/);
  assert.match(read("src/app/api/dashboard/stats/route.ts"), /nextDue: \{ lt: startOfAppToday\(now\) \}/);
});
