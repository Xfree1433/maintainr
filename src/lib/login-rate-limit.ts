/**
 * Login brute-force limiter (security audit 2026-10-26).
 *
 * In-process and in-memory on purpose: the app runs as one `node server.js`
 * (output: "standalone") per container, so one Map sees every login. A restart
 * resets the counters, which is acceptable for this threat.
 *
 * Counts failed sign-ins per client IP + lower-cased email, and per IP, over a
 * fixed 15-minute window from the first failure. An attempt is counted when it
 * STARTS (so a parallel burst can't all slip past the check while bcrypt runs)
 * and handed back on success, which also clears the IP + email counter.
 *
 * The app only receives traffic through the Cloudflare tunnel, so the client IP
 * is CF-Connecting-IP (set by Cloudflare; a client can't forge it through CF).
 */

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES_PER_IP_EMAIL = 5;
export const MAX_FAILURES_PER_IP = 30;
const MAX_KEYS = 50_000;

type Bucket = { count: number; resetAt: number };

type HeaderSource = { get(name: string): string | null } | null | undefined;

/** CF-Connecting-IP, else the first X-Forwarded-For hop, else "unknown". */
export function clientIp(headers: HeaderSource): string {
  const cf = headers?.get("cf-connecting-ip")?.trim();
  if (cf) return cf.slice(0, 64);
  const xff = headers?.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff.slice(0, 64);
  return "unknown";
}

export function createLoginLimiter(opts?: {
  windowMs?: number;
  maxPerIpEmail?: number;
  maxPerIp?: number;
  maxKeys?: number;
}) {
  const windowMs = opts?.windowMs ?? LOGIN_WINDOW_MS;
  const maxPerIpEmail = opts?.maxPerIpEmail ?? MAX_FAILURES_PER_IP_EMAIL;
  const maxPerIp = opts?.maxPerIp ?? MAX_FAILURES_PER_IP;
  const maxKeys = opts?.maxKeys ?? MAX_KEYS;
  const buckets = new Map<string, Bucket>();

  const ipKey = (ip: string) => `ip:${ip}`;
  const ipEmailKey = (ip: string, email: string) =>
    `ie:${ip}|${email.trim().toLowerCase().slice(0, 320)}`;

  function live(key: string, now: number): Bucket | undefined {
    const b = buckets.get(key);
    if (b && b.resetAt <= now) {
      buckets.delete(key);
      return undefined;
    }
    return b;
  }

  function bump(key: string, now: number) {
    const b = live(key, now);
    if (b) {
      b.count += 1;
      return;
    }
    if (buckets.size >= maxKeys) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
      // Still full: drop the oldest entries (Map keeps insertion order).
      for (const k of buckets.keys()) {
        if (buckets.size < maxKeys) break;
        buckets.delete(k);
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
  }

  return {
    /**
     * Call before checking the password. Returns false when the caller is
     * over a limit (fail the login without checking the password). Returns
     * true and counts the attempt as a failure until `succeeded` is called.
     */
    attempt(ip: string, email: string, now = Date.now()): boolean {
      const ie = live(ipEmailKey(ip, email), now);
      const i = live(ipKey(ip), now);
      if ((ie && ie.count >= maxPerIpEmail) || (i && i.count >= maxPerIp)) {
        return false;
      }
      bump(ipEmailKey(ip, email), now);
      bump(ipKey(ip), now);
      return true;
    },

    /** The attempt succeeded: clear IP + email, and un-count it for the IP. */
    succeeded(ip: string, email: string, now = Date.now()): void {
      buckets.delete(ipEmailKey(ip, email));
      const i = live(ipKey(ip), now);
      if (i) {
        i.count -= 1;
        if (i.count <= 0) buckets.delete(ipKey(ip));
      }
    },

    /** For tests. */
    size(): number {
      return buckets.size;
    },
  };
}

export const loginLimiter = createLoginLimiter();
