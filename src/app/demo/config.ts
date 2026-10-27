/**
 * The public /demo auto-login. Off unless ENABLE_DEMO=true, and the demo
 * account's credentials come from the environment (DEMO_EMAIL, DEMO_PASSWORD)
 * so they never ship in source or in the client bundle: sign-in happens in a
 * server action and only the session cookie reaches the browser.
 */
export function demoCredentials(): { email: string; password: string } | null {
  if (process.env.ENABLE_DEMO !== "true") return null;
  const password = process.env.DEMO_PASSWORD;
  if (!password) return null;
  return { email: process.env.DEMO_EMAIL || "mark@acme-mfg.com", password };
}
