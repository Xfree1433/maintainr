// Server-side PostHog helper (posthog-node).
// Used for trustworthy events: signup, login, activation. See pf9-store/POSTHOG_TRACKING_PLAN.md.
import { PostHog } from "posthog-node";

// The app slug that tags every event from this app.
const APP_SLUG = "maintainr";

let client: PostHog | null = null;

function getClient(): PostHog | null {
  const key = process.env.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!client) {
    client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

type Props = Record<string, unknown>;

/**
 * Capture a server-side event. `distinctId` should be the user's email so the
 * journey stitches with the anonymous storefront session (which identifies by email).
 * Pass `account` (organization id) to populate group analytics.
 * Set `awaitFlush=false` on hot paths to avoid adding request latency.
 */
export async function captureServer(
  event: string,
  distinctId: string,
  properties: Props = {},
  opts: { account?: string; awaitFlush?: boolean } = {}
): Promise<void> {
  const ph = getClient();
  if (!ph || !distinctId) return;
  try {
    ph.capture({
      distinctId,
      event,
      properties: { app: APP_SLUG, ...properties },
      groups: opts.account ? { account: opts.account } : undefined,
    });
    if (opts.awaitFlush !== false) await ph.flush();
  } catch {
    // analytics must never break the request
  }
}

/** Set person properties (call once at signup). */
export async function identifyServer(
  distinctId: string,
  properties: Props = {}
): Promise<void> {
  const ph = getClient();
  if (!ph || !distinctId) return;
  try {
    ph.identify({ distinctId, properties });
    await ph.flush();
  } catch {
    // no-op
  }
}
