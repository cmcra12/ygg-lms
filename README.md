# YGG Loan Management System

Internal loan management for Yellowgate Group (YGG) — a stripped-back replacement for
finPOWER Connect that does exactly what YGG uses and nothing more. Rental-only asset
finance: the ledger is scheduled recurring charges (RENT, DAMAGE WAIVER, …) versus
receipts. No interest accrual, no amortisation, no payout-figure engine.

**Phases 1 and 2 of the four-phase plan are built.**

- *Phase 1 — Foundation:* scaffold, schema, auth + RBAC, automatic audit trail,
  global search, customers (contacts + insurance), external parties, master asset
  register, loans with read-only ledger, payment history drilldown, dashboard,
  seed data and CSV export everywhere.
- *Phase 2 — Originations:* applications with the deal snapshot (value, RR, ROI,
  term, brokerage), originations checklist with stubbed credit check / Info Agent /
  ID verification / PPSR search (each with a manual mark-done fallback), credit
  approval and rental contract generation from editable `.docx` templates
  (`templates/` — see its README for placeholders), and approved-application →
  loan account conversion with PMSI registration.

## Setup (local development)

Requires Node.js 22+. No database install needed — without `DATABASE_URL` the app
runs an embedded Postgres (PGlite) that persists to `data/pgdata`.

```bash
npm install
npm run db:migrate   # applies drizzle/ migrations
npm run db:seed      # loads realistic fake Australian demo data
npm run dev          # http://localhost:3000
```

Seeded logins (all use password `yellowgate` — change them in Staff after first login):

| Email | Role |
|---|---|
| admin@ygg.com.au | admin |
| credit@ygg.com.au | credit |
| operations@ygg.com.au | operations |

`npm run db:reset` drops the local database and re-runs migrate + seed.
For production: `npm run build && npm start`.

### Scale test data — 1,600 fake deals

`npm run db:seed-scale` (run after a normal seed) loads a full book on top of the
demo data: ~1,600 converted deals (contracts YGG51650–YGG53249) across ~780
customers, with assets, PPSR registrations, schedules, DDRs, ~40,000 ledger
transactions, ~50 accounts in arrears and open collections workflows. The
generator is deterministic — rerunning after a reset produces the same book.

The script also writes `supabase-scale-deals-part1..4.sql`: **additive** files
that load the identical book into a live Supabase database (run each part in
order in the SQL Editor). All generated rows use ids above 100000, so existing
data is untouched. To remove the scale data later:

```sql
DELETE FROM audit_log WHERE id > 100000;   -- then the same for: workflow_items, workflows,
-- ppsr_events, ppsr_registrations, direct_debit_authorities, transactions, loan_schedules,
-- application_checklist_items, application_assets, assets, loans, applications,
-- insurance_policies, customer_contacts, customers (in that order)
```

`node scripts/perf.mjs` (with the app running) prints page-load timings — useful
after loading the scale book.

## Production: Supabase + a Node host

The database lives in **Supabase** (managed Postgres); the Next.js app itself runs on
any Node host (Vercel is the usual pairing — Supabase does not host Next.js apps).

**1. Create the Supabase project** at [supabase.com](https://supabase.com) (Region:
Sydney `ap-southeast-2`). Note the database password you set.

**2. Get the connection string** — dashboard → **Connect** →
- long-running server (a VM, Railway, Render, Fly.io): **Session pooler** (port 5432)
- serverless (Vercel, AWS Lambda): **Transaction pooler** (port 6543) — the app
  already sets `prepare: false` on the driver, which the transaction pooler requires.

It looks like
`postgresql://postgres.<project-ref>:<password>@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres`.

**3. Load the schema (and demo data). Two ways — pick one:**

*No terminal (easiest):* open the Supabase dashboard → **SQL Editor**, paste the whole
of [`supabase-setup.sql`](./supabase-setup.sql) from this repo, and click **Run**.
That creates every table and loads the demo data in one shot. Only run it on an
empty project. (Regenerate the file after schema changes with
`npm run db:reset && npx tsx scripts/export-supabase-setup.ts`.)

*Terminal:*

```bash
DATABASE_URL="postgresql://postgres.<ref>:<password>@...pooler.supabase.com:5432/postgres" npm run db:migrate
DATABASE_URL="..." npm run db:seed        # optional demo data; skip for a clean production start
```

Migrations are plain SQL committed under `drizzle/` and tracked by Drizzle in the
database, so re-running `db:migrate` only applies what's new — `supabase-setup.sql`
records the same bookkeeping, so the two paths stay compatible.

**4. Deploy the app** with `DATABASE_URL` set as an environment variable (on Vercel:
Project → Settings → Environment Variables). Nothing else is required — auth
sessions, audit log and all data live in Supabase.

Notes:
- The app talks to Supabase **only** via `DATABASE_URL` (plain Postgres). It does not
  use Supabase Auth, RLS or the supabase-js client — auth is the app's own session
  system, and RBAC is enforced in the app layer, so keep the connection string secret
  and don't expose the database publicly.
- To reseed a Supabase database, drop and recreate the tables (Supabase SQL editor:
  `drop schema public cascade; create schema public;` plus `drop schema drizzle cascade;`)
  then re-run migrate + seed. There is deliberately no destructive reset script for
  remote databases.

## Architecture

Single full-stack **Next.js (App Router, TypeScript)** app. Server components read
straight from the database; all writes go through server actions. One deployable.

```
src/
  db/
    schema.ts        # Drizzle schema — every table, Postgres dialect
    index.ts         # DATABASE_URL → Supabase/Postgres, otherwise embedded PGlite
    mutate.ts        # THE audited mutation layer — see below
    migrate.ts       # applies drizzle/ SQL migrations
    seed.ts          # demo data (valid ABNs/ACNs, VINs, regos, AU suburbs)
  lib/
    auth.ts          # session auth: bcrypt + DB sessions + HTTP-only cookie
    password.ts      # bcrypt hash/verify (shared with scripts)
    rbac.ts          # role → permission map (admin / credit / operations)
    abn.ts           # ABN/ACN checksum validation + formatting
    format.ts        # AUD money (integer cents), DD/MM/YYYY, Australia/Sydney
    search.ts        # global search (names, codes, mobiles, emails, VIN, rego, serial, contract no.)
  integrations/      # one interface per external service + mock drivers
  components/
    DataTable.tsx    # the one list component: sort, filter, CSV export
    AuditTrail.tsx   # per-entity audit history for detail screens
    FormFrame.tsx    # create/edit form wrapper with validation errors
  app/
    (app)/           # authenticated screens (layout enforces requireUser)
    login/
  middleware.ts      # fast cookie-presence redirect (real check is requireUser)
```

### Conventions (non-negotiable)

- **Money**: integer **cents**, always **ex-GST**, with GST tracked in its own column
  per row (schedules and transactions) for BAS reporting. Display via `formatMoney`.
- **Dates**: stored ISO `YYYY-MM-DD`; displayed DD/MM/YYYY, Australia/Sydney.
- **ABN/ACN**: checksum-validated on entry (`src/lib/abn.ts`).
- **RR / ROI**: manually entered per deal from YGG's external quote tools — this app
  never calculates them.

### Audit trail

`src/db/mutate.ts` is the only way to write business tables. `auditedInsert`,
`auditedUpdate` and `auditedDelete` write the row **and** its `audit_log` entry
(actor, action, before/after JSON) in one transaction. No screen may call
`db.insert/update/delete` on a business table directly — that is what makes the
audit trail automatic and un-bypassable. The audit log is append-only, viewable
globally at `/audit` (admin nav) and per-record on every detail screen.

### Auth & RBAC

Custom lightweight session auth: bcrypt password hashes, a `sessions` table, and an
HTTP-only `ygg_session` cookie (7-day expiry). `middleware.ts` only checks cookie
presence; `requireUser()` does the real session lookup on every page and action.
Swapping to Microsoft Entra ID later means replacing `src/lib/auth.ts`'s
`getCurrentUser`/login flow — role checks stay unchanged.

Roles (`src/lib/rbac.ts`): **admin** (everything, incl. staff management and
hard-deletes), **credit** and **operations** (create/edit records, view audit).
Adjust the permission map in one place as Phase 2+ needs finer grain.

### Schema notes

The full schema for all four phases is already migrated — including originations
(`applications`, checklist items, documents), money (`loan_schedules`,
`transactions`, `direct_debit_authorities`) and collateral (`ppsr_registrations`,
`ppsr_events`) — so later phases and the finPOWER CSV importer have a stable target.
Postgres via Drizzle everywhere — Supabase in production and embedded PGlite locally
share the same dialect and the same committed SQL migrations, so there is no
dev/prod drift. Money is integer cents, JSON audit snapshots are text.

One application converts to exactly one loan (`loans.application_id` is unique).
Assets carry current customer/loan links; reassignment to a new loan is blocked in
the asset action while the previous loan is still active.

## Integrations (stub pattern)

Each external service has a TypeScript interface in `src/integrations/types.ts`, a
mock driver in `mocks.ts`, and env-based selection in `index.ts`:

| Service | Interface | Env var |
|---|---|---|
| Xero (payments) | `XeroClient` | `XERO_DRIVER` |
| Zepto (direct debit) | `ZeptoClient` | `ZEPTO_DRIVER` |
| PPSR / AFSA | `PpsrClient` | `PPSR_DRIVER` |
| Credit bureau (Equifax/illion) | `CreditBureauClient` | `CREDIT_BUREAU_DRIVER` |
| Info Agent | `InfoAgentClient` | `INFO_AGENT_DRIVER` |
| ID verification | `IdVerificationClient` | `ID_VERIFICATION_DRIVER` |

**To swap a stub for the real API:**

1. Implement the interface in a new file, e.g. `src/integrations/xero-real.ts`.
2. Register it in `src/integrations/index.ts`: `pick(process.env.XERO_DRIVER, { mock: mockXero, real: realXero })`.
3. Set `XERO_DRIVER=real` (plus whatever credentials your driver reads from env).

Nothing else changes — screens only ever import the interface. Every integration
also keeps a manual-entry path in the UI so the app works end-to-end with zero
credentials.

## Phase plan

- **Phase 1 — Foundation**: ✅ built.
- **Phase 2 — Originations**: ✅ built — application form + checklist workflow,
  stubbed credit check / Info Agent / ID matrix, CA + contract generation from
  `.docx` templates (docxtemplater + pizzip), PPSR search stub, application →
  loan conversion, PMSI registration.
- **Phase 3 — Money**: transaction entry, recurring schedule engine, upfronts via
  Xero stub, Zepto DDR capture, dishonour fee + arrears flag flow.
- **Phase 4 — Lifecycle & reporting**: PPSR discharge/renew, asset transitions and
  reassignment, real portfolio metrics, report export framework, expiry alerts,
  finPOWER CSV importer.
