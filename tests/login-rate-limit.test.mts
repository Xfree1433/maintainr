/**
 * Login brute-force limiter (security audit 2026-10-26).
 *
 * Run: npx tsx --test tests/login-rate-limit.test.mts
 */
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  createLoginLimiter,
  clientIp,
  LOGIN_WINDOW_MS,
  MAX_FAILURES_PER_IP_EMAIL,
  MAX_FAILURES_PER_IP,
} = await import("../src/lib/login-rate-limit.js");

const T0 = 1_000_000;

test("defaults are 5 per IP+email and 30 per IP over 15 minutes", () => {
  assert.equal(MAX_FAILURES_PER_IP_EMAIL, 5);
  assert.equal(MAX_FAILURES_PER_IP, 30);
  assert.equal(LOGIN_WINDOW_MS, 15 * 60 * 1000);
});

test("5 failures for one IP+email, then the 6th is refused", () => {
  const l = createLoginLimiter();
  for (let n = 0; n < 5; n++) assert.equal(l.attempt("1.2.3.4", "a@x.com", T0), true);
  assert.equal(l.attempt("1.2.3.4", "a@x.com", T0), false);
  // The email is lower-cased and trimmed for the key.
  assert.equal(l.attempt("1.2.3.4", " A@X.com ", T0), false);
  // Same email from another IP, and another email from the same IP, still allowed.
  assert.equal(l.attempt("5.6.7.8", "a@x.com", T0), true);
  assert.equal(l.attempt("1.2.3.4", "b@x.com", T0), true);
});

test("30 failures from one IP across many emails, then every email is refused", () => {
  const l = createLoginLimiter();
  for (let n = 0; n < 30; n++) assert.equal(l.attempt("9.9.9.9", `u${n}@x.com`, T0), true);
  assert.equal(l.attempt("9.9.9.9", "fresh@x.com", T0), false);
  assert.equal(l.attempt("8.8.8.8", "fresh@x.com", T0), true);
});

test("the window expires 15 minutes after the first failure", () => {
  const l = createLoginLimiter();
  for (let n = 0; n < 5; n++) l.attempt("1.2.3.4", "a@x.com", T0);
  assert.equal(l.attempt("1.2.3.4", "a@x.com", T0 + LOGIN_WINDOW_MS - 1), false);
  assert.equal(l.attempt("1.2.3.4", "a@x.com", T0 + LOGIN_WINDOW_MS), true);
});

test("success clears the IP+email counter and un-counts the attempt for the IP", () => {
  const l = createLoginLimiter();
  for (let n = 0; n < 4; n++) l.attempt("1.2.3.4", "a@x.com", T0);
  assert.equal(l.attempt("1.2.3.4", "a@x.com", T0), true); // 5th: the right password
  l.succeeded("1.2.3.4", "a@x.com", T0);
  for (let n = 0; n < 5; n++) assert.equal(l.attempt("1.2.3.4", "a@x.com", T0), true);
  assert.equal(l.attempt("1.2.3.4", "a@x.com", T0), false);

  // Successful logins never use up the per-IP budget (a shared office IP).
  const m = createLoginLimiter();
  for (let n = 0; n < 100; n++) {
    assert.equal(m.attempt("10.0.0.1", `staff${n}@x.com`, T0), true);
    m.succeeded("10.0.0.1", `staff${n}@x.com`, T0);
  }
});

test("a refused attempt is not counted and does not extend the window", () => {
  const l = createLoginLimiter();
  for (let n = 0; n < 5; n++) l.attempt("1.2.3.4", "a@x.com", T0);
  for (let n = 0; n < 50; n++) assert.equal(l.attempt("1.2.3.4", "a@x.com", T0 + 1000), false);
  assert.equal(l.attempt("1.2.3.4", "a@x.com", T0 + LOGIN_WINDOW_MS), true);
});

test("memory stays bounded under a flood of distinct keys", () => {
  const l = createLoginLimiter({ maxKeys: 100 });
  for (let n = 0; n < 1000; n++) l.attempt(`ip${n}`, `u${n}@x.com`, T0);
  assert.ok(l.size() <= 100, `size ${l.size()}`);
});

test("clientIp: CF-Connecting-IP, then first X-Forwarded-For hop, then 'unknown'", () => {
  assert.equal(
    clientIp(new Headers({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "10.0.0.1" })),
    "203.0.113.7"
  );
  assert.equal(
    clientIp(new Headers({ "x-forwarded-for": " 198.51.100.2 , 10.0.0.1" })),
    "198.51.100.2"
  );
  assert.equal(clientIp(new Headers()), "unknown");
  assert.equal(clientIp(undefined), "unknown");
});
