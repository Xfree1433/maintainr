# MAINTAINR — fix & test log

PF9 Next.js 15 (App Router) CMMS. NextAuth v5 (JWT) / Prisma + PostgreSQL.
Container port 3000 (host 3002 in compose). Branch **`master`** (NOT main).
Origin `Xfree1433/maintainr`. Deployed at maintainr.plainspokenfoundrynine.com
via `~/.local/bin/pf9-deploy maintainr` (rsyncs local working tree → pf9-2, then
`docker compose up -d --build maintainr`). **Login page is `/login`** (`/auth/signin`
307-redirects to it) — unlike the other Next.js PF9 apps.

## Status: functional-test triage complete (2026-06-07)

A full manual functional test pass (T0–T11) surfaced 12 bugs + 4 gaps. All genuine
**code defects are fixed and deployed**; the remainder are either by-design,
already-correct-in-code (stale-deploy artifacts), or feature-scope decisions left
for the owner. NOT yet marked "completely tested" because real feature gaps remain
(asset-detail tabs, WO status UI, PM auto-generator, editable settings).

### Fixed & deployed — commit `d878d49`

| Item | What it was | Fix |
|---|---|---|
| BUG-01 (P0) | WO detail crashed (`e.unitCost.toFixed is not a function`) once any part attached. Prisma `Decimal` serializes as a **string**. | `Number(pu.unitCost).toFixed(2)` in `work-orders/[id]/page.tsx`. |
| BUG-02 (P0) | Asset/Technician/Part dropdowns empty on WO-create, schedule-create, and WO-detail Add-Part. | Those APIs return **bare arrays**; pages read `data.assets ?? []`. Made consumers tolerate both: `Array.isArray(data) ? data : data.x ?? []` in `work-orders/page.tsx`, `schedules/page.tsx`, `work-orders/[id]/page.tsx`. |
| BUG-03 (P0) | `POST /api/work-orders/[id]/parts` had no stock or org guard — inventory went **negative** (-7), and any org's part id was attachable. | Scope `findFirst({ id, organizationId })`, reject `part.quantity < requested` (400), wrap usage-insert + stock-decrement in `prisma.$transaction`. |
| BUG-05 (P1) | MTBF report returned **-16.4 h** for overlapping downtime (prev-end → next-start delta went negative). | Measure **start-to-start** intervals, skip non-positive deltas. `reports/mtbf/route.ts`. |
| BUG-06 (P1) | Costs report always empty — read `laborCost`/`partsCost` columns that are never written. | Compute live: parts = Σ(PartUsage.unitCost × qty), labor = actualHours × technician.hourlyRate; fall back to stored snapshot columns if populated. `reports/costs/route.ts`. |
| BUG-07 (P2) | MTTR rounded to 1 decimal → sub-6-min repairs showed 0.0. | 2-decimal precision. `reports/mttr/route.ts`. |
| BUG-12 (P2) | Schedule frequency and intervalDays were independent. | On frequency change, set canonical interval (DAILY1/WEEKLY7/BIWEEKLY14/MONTHLY30/QUARTERLY90/SEMI_ANNUAL180/ANNUAL365); CUSTOM keeps manual value. `schedules/page.tsx`. |

### Not code defects (no change, or resolved by the redeploy)

- **BUG-04 (planned downtime not persisting):** code path is **provably correct** —
  checkbox → `planned: form.planned` → validator `planned: z.boolean().default(false)`
  → `create({ data: { ...parsed.data } })` → `planned` column exists in the init
  migration. Most likely a **stale-deploy artifact** (see note below). **Re-verify in
  browser** against the current deploy.
- **BUG-08 (`/demo` 404):** **by design.** `src/app/demo/page.tsx` calls `notFound()`
  in production unless `ENABLE_DEMO=true` (the `65f4c8f` "/demo gate" code-review fix).
- **BUG-11 (Radix "DialogContent requires a DialogTitle"):** current code is already
  correct — all four Radix dialogs (assets/parts/technicians/connectors) have a
  `DialogTitle` inside `DialogContent > DialogHeader`. The WO/schedule/downtime
  modals are custom divs, not Radix. This was a **stale-deploy artifact**; the
  redeploy clears it.

> **Stale-deploy root cause (important):** the live build had been **lagging the
> working tree** because `package.json` got `posthog-js`/`posthog-node` added in an
> earlier session but `package-lock.json` was never regenerated — so `npm ci` in the
> Docker build failed and the last *successful* image predated the PostHog work (and
> several UI files). Fixed by `npm install --package-lock-only` then redeploy
> (commit `eb85b8c`). This is why a few reported "bugs" (BUG-04 checkbox, BUG-11
> titles) don't reproduce in the source — the tester hit an older image.

### Open — feature gaps / design decisions (owner to decide)

- **BUG-09:** Asset detail has only Overview / Sensor Data / Work Orders tabs — no
  Downtime or Schedules linkage. (feature add)
- **BUG-10:** WO detail UI only exposes "Complete Work Order" — no Start-Work /
  status-transition control (OPEN→IN_PROGRESS done only via API). (feature add)
- **GAP-01:** No PM **schedule → WO auto-generator**; overdue schedules are
  visual-only. No background scheduler exists. (feature add)
- **GAP-02:** Completing a WO **always forces the asset to OPERATIONAL** — indiscriminate
  for DOWN/DECOMMISSIONED assets. (design decision)
- **GAP-03:** Settings page is **read-only** (Profile + Team display only). (feature add)
- **GAP-04:** WO completed directly OPEN→COMPLETED has `startedAt=null`; correctly
  excluded from MTTR. Informational — document the skip.

## Gotchas / how this app works

- **Prisma `Decimal` → JSON string.** `unitCost`, `laborCost`, `partsCost`,
  `purchaseCost`, `hourlyRate` are `@db.Decimal` and arrive as **strings** in API
  responses; always `Number(...)` before arithmetic/`.toFixed()`. `actualHours` /
  `estimatedHours` are `Float` (real numbers).
- **Inconsistent API response shapes.** `/api/assets`, `/api/technicians`,
  `/api/parts` return **bare arrays**; `/api/work-orders`, `/api/schedules` return
  **wrapped** objects (`{workOrders}`, `{schedules}`). New consumers must tolerate
  both or know which they're hitting.
- **Lockfile must stay in sync with package.json** or the Docker `npm ci` fails the
  whole deploy. After adding a dep, run `npm install --package-lock-only` and commit
  the lock. (PostHog deps `posthog-js`/`posthog-node` install in Docker; they are
  **not** in local `node_modules`, so a local `npm run build`/`tsc` reports 3
  module-not-found errors for `posthog-js`, `posthog-js/react`, `posthog-node` —
  expected, ignore.)
- **Prisma client not generated locally** by default — run `npx prisma generate`
  before a local `tsc --noEmit`.
- **Manual migration system:** pf9-deploy applies each `prisma/migrations/*/migration.sql`
  via `docker exec -i pf9-apps-postgres-1 psql -U pf9admin`. Idempotent; `/api/health`
  reports the applied count.
- **Login is `/login`** (not `/auth/signin`). `/api/health` is a public route
  (whitelisted in `auth.config.ts`).
- Recurring: stale `.git/index.lock` → `rm -f .git/index.lock` before committing.

## Commits (this pass)

- `eb85b8c` — PostHog instrumentation (signup/login/core_action), `bootstrap-admin.ts`,
  `/api/health`, and the **package-lock.json sync** that unblocked the Docker build.
- `d878d49` — the seven functional-test code-defect fixes (BUG-01/02/03/05/06/07/12).
