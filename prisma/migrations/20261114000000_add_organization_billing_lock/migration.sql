-- Billing lock: the PF9 store's plan route (POST /api/auth/plan) sets this
-- when a subscription ends and clears it when it is active again. Null = not
-- locked. Nullable with no default, so existing organizations stay unlocked.
-- Idempotent — safe to re-run (the pf9 deploy replays every migration.sql).

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "billingLockedAt" TIMESTAMP(3);
