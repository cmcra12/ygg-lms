# YGG Loan Management System

Internal loan management for Yellowgate Group (YGG) — a stripped-back replacement for
finPOWER Connect that does exactly what YGG uses and nothing more. Rental-only asset
finance: the ledger is scheduled recurring charges (RENT, DAMAGE WAIVER, …) versus
receipts. No interest accrual, no amortisation, no payout-figure engine.

**This is Phase 1 (Foundation)** of the four-phase plan: scaffold, schema, auth + RBAC,
automatic audit trail, global search, customers (contacts + insurance), external
parties, master asset register, loans with read-only ledger, payment history
drilldown, dashboard, seed data and CSV export everywhere.

## Setup

Requires Node.js 22+.

```bash
npm install
npm run db:migrate   # creates data/ygg.db and applies drizzle/ migrations
npm run db:seed      # loads realistic fake Australian demo data
npm run dev          # http://localhost:3000
```

Seeded logins (all use password `yellowgate` — change them in Staff after first login):

| Email | Role |
|---|---|
| admin@ygg.com.au | admin |
| credit@ygg.com.au | credit |
| operations@ygg.com.au | operations |

`npm run db:reset` drops the database and re-runs migrate + seed.
For production: `npm run build && npm start`.

## Architecture

Single full-stack **Next.js (App Router, TypeScript)** app. Server components read
straight from the database; all writes go through server actions. One deployable.

```
src/
  db/
    schema.ts        # Drizzle schema — every table, SQLite dialect kept portable
    index.ts         # better-sqlite3 connection (WAL, FK enforcement)
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
SQLite via Drizzle, kept dialect-portable for the eventual Postgres move: no SQLite-only
column types, JSON stored as text, booleans as integers, money as integers.

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

- **Phase 1 — Foundation** (this): everything described above.
- **Phase 2 — Originations**: application form + checklist workflow, stubbed credit
  check / Info Agent / ID matrix, CA + contract generation from `.docx` templates
  (docxtemplater + pizzip), PPSR search stub, application → loan conversion, PMSI registration.
- **Phase 3 — Money**: transaction entry, recurring schedule engine, upfronts via
  Xero stub, Zepto DDR capture, dishonour fee + arrears flag flow.
- **Phase 4 — Lifecycle & reporting**: PPSR discharge/renew, asset transitions and
  reassignment, real portfolio metrics, report export framework, expiry alerts,
  finPOWER CSV importer.
