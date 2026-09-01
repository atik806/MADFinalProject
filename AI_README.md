# SOFOL — AI Development Context (technical memory)

This file is the durable, honest engineering log for the SOFOL backend. It records what is
**actually implemented and verified**, what is partial, and what is planned — so any future
session can resume without guessing. Human-facing setup lives in [README.md](README.md).

**Golden rule:** nothing is documented as "Implemented" unless it has been run and works.

---

## Project architecture

- **Frontend** — Expo (SDK 56) / React Native / TypeScript at the repo root (`src/`).
  File-based routing (`expo-router`), state in React Context, mock/local data in `src/data/`.
  Currently runs on local state; not yet wired to the backend.
- **Backend** — Express 5 + TypeScript in `server/`. Modular:
  `server/src/modules/<role>/<feature>/{controller,routes,service}`. All business logic and
  the only Supabase access live here.
- **Supabase** — Auth + Postgres + Storage. The server uses the **service-role** client
  (`server/src/config/supabase.ts`), which bypasses RLS; the key is server-only.

**Request flow:** Route → Middleware (`authenticate` → role guard) → Controller → Service → Supabase.

**Response contract:** target is `{ success, message, data }`.
> The **admin** module already returns `{ success, message, data }`. As of Milestone 4 the
> **farmer** module's data endpoints also return `{ success, message, data }` (GET `/me`
> now included); `dashboard` still returns a bare payload object. The **field officer** and
> **bank officer** modules follow the contract throughout.

**Live database note:** the connected Supabase project has the admin/officer schema applied
(audit_logs, admin/field-officer columns, loan review columns, etc. exist live, with prior data).
`farmer_db.sql` and `admin.sql` reproduce that schema for a fresh project.
> ⚠️ **The Milestone 5 bank-officer columns are NOT applied live.** `profiles.bank_name`,
> `branch_name`, `branch_code` and `loan_applications.bank_officer_id`, `reviewed_at`,
> `decision_at`, `decision_notes`, `approved_amount` all return Postgres `42703` on the
> connected project. Run the bank-officer block of `admin.sql` in the Supabase SQL editor
> before using or testing `/api/bank-officer`.

---

## Role implementation status

| Role          | Status                | Notes                                                                 |
| ------------- | --------------------- | --------------------------------------------------------------------- |
| Admin         | Implemented (core)    | auth (login/me/change-password/seed), dashboard (stats/trends/overview), audit trail, and field-officer **read** management are **mounted at `/api/admin` and verified live**. Field-officer **create/update/status/reset** are wired + schema-backed but not yet live-mutation-tested. Bank-officer provisioning (`create`/`list`/`status`) is implemented but **not yet live-verified**. Generic user management, reports, and settings still planned. |
| Farmer        | Implemented (backend, hardened + verified live) | auth (register/login/reset/upload/me), profile (`GET/PUT /me` + `/profile` alias, privileged columns filtered), read-only credit profile, dashboard, transactions (full CRUD, whitelisted updates, sign-convention amounts), loans (list/get/apply, pinned `pending`, shared lifecycle), notifications — mounted at `/api/farmer` and verified live with a 64-assertion E2E suite. Frontend API wiring remains open (contexts still local/mock). |
| Field Officer | Implemented (core + loans) | Profile, assigned-farmer management/registration, verification history/update, field visits, and the loan-application workflow (draft → submit → verify → forward) are mounted at `/api/field-officer` and verified live. Frontend API wiring remains open. |
| Bank Officer  | **Implemented (backend) — NOT live-verified** | Profile (`GET/PUT /profile/me`), forwarded-application review queue, application detail, `pending → under_review`, and the `approved`/`rejected` decision are written, type-checked (`npm run build` passes) and mounted at `/api/bank-officer`. **Nothing has been executed against a live database yet**: the `admin.sql` bank-officer columns have not been applied to the connected Supabase project, and `server/test/bank-officer.e2e.cjs` has never been run. Treat every behaviour below as *intended*, not *proven*. Disbursement and repayment are out of scope. |

---

## Backend baseline

**Foundation (server/src):**

- `app.ts` — `cors` (origin `*`), `express.json()`, health `GET /` →
  `{ message: 'Sofol api is running' }`, mounts `/api/farmer`, `/api/admin`,
  `/api/field-officer`, and `/api/bank-officer`, 404 handler,
  generic 500 error handler.
- `server.ts` — `app.listen(process.env.PORT || 3000)`.
- `config/supabase.ts` — `supabase` + `supabaseAdmin` service-role clients; **throws at startup**
  if `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are missing. `persistSession: false`.
- `middleware/auth.middleware.ts` — `authenticateUser`: Bearer → `supabase.auth.getUser` →
  `req.user`; `401` on missing/invalid.
- `middleware/role.middleware.ts` (`farmerOnly`), `admin.middleware.ts` (`adminOnly`),
  `fieldOfficer.middleware.ts` — role guards; read role from `profiles`, self-heal, fall back
  to auth metadata, `403` otherwise. `adminOnly` also short-circuits for the env `ADMIN_EMAIL`.
- `middleware/bankOfficer.middleware.ts` — `bankOfficerOnly`. Deliberately **stricter** than the
  other guards: it does **not** self-heal a missing profile (bank officers are always
  admin-provisioned, so a missing row is never legitimate — self-healing it would let any
  authenticated Supabase user mint loan-approval authority) and it re-reads `profiles.status` on
  every request, so a suspended officer loses access immediately instead of when their token
  expires.

**Farmer module** (`modules/farmer/*`): mounts `/auth`, `/me` (alias of `/profile`), `/profile`,
`/credit`, `/dashboard`, `/loans`, `/transactions`, `/notifications`; all data routes behind
`authenticateUser` + `farmerOnly`. `validation.ts` holds the shared farmer validation helpers
(UUID, text, signed-amount, category, installment-type, safe-error allowlist).

**Admin module** (`modules/admin/*`, mounted at `/api/admin`):
- `admin.routes.ts` — barrel: `/auth`, `/dashboard`, `/field-officers`, `/bank-officers`, `/audit`.
- `auth/*` — `POST /login` (public, self-seeds admin), `POST /seed` (public, idempotent),
  `GET /me`, `POST /change-password` (guarded). Admin creds from `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- `dashboard/*` — `GET /stats`, `/registration-trend`, `/loan-analytics`, `/recent-activity`,
  `/overview` (guarded). Counts degrade to 0 on missing tables via `safeCount`.
- `fieldOfficers/*` — `GET /` (list, paginated/search/filter), `GET /:id`, `POST /` (create),
  `PUT /:id`, `PATCH /:id/status`, `POST /:id/reset-password` (guarded). Creates a
  `field_officer` auth user + profile; edits via a field white-list.
- `bankOfficers/*` — `GET /` (list + per-officer decision count), `POST /` (create),
  `PATCH /:id/status` (guarded). Exists because the `bank_officer` role had **no** provisioning
  path at all: without it `/api/bank-officer` is unreachable. Status changes are the admin's
  kill switch for an officer who holds approval authority.
- `officerAccounts.ts` — shared staff-provisioning primitives (`normalizePhone`, `shortHex`,
  `findOrphanAuthUser`, `createOfficerAuthUser`) so a second officer type cannot drift from the
  established behaviour. Currently used by `bankOfficers` only; migrating `fieldOfficers` onto it
  is backlog.
- `audit/*` — `recordAuditLog` (best-effort insert) + `GET /` (paginated audit trail, guarded).

**Field Officer module** (`modules/fieldOfficer/*`, mounted at `/api/field-officer`):
- `profile/*` — guarded `GET /profile/me` and `PUT /profile/me`; updates use a field white-list.
- `farmers/*` — guarded list/get/update for active assignments and `POST /farmers` to create a
  farmer Auth user, farmer profile, and active officer assignment. Privileged roles and profile
  fields are never accepted from the request.
- `verification/*` — guarded `GET /verification`, `POST /verification/farmers/:id`, and
  `PUT /verification/:id`; status changes update the farmer's `is_verified` flag only after
  assignment authorization succeeds.
- `visits/*` — guarded list/create/get/update plus complete/cancel transitions. Visit ownership
  is checked for every read/write; `scheduledDate` is accepted as a compatibility alias for
  `visitDate`.
- `loans/*` — guarded loan-application workflow for assigned farmers: list (with
  `status`/`verificationStatus`/`farmerId`/pagination filters), create as draft, get (with
  timeline + farmer summary), edit draft fields, submit (`draft` → `pending`), record a
  verification verdict, and forward to the bank. See the Milestone 3 log for the full
  lifecycle and authorization rules.
- `validation.ts` — shared UUID, date, pagination, bounded text, array, and boolean validation
  used by the Field Officer handlers/services.

**Bank Officer module** (`modules/bankOfficer/*`, mounted at `/api/bank-officer`)
— *written and type-checked, not yet live-verified*:
- `profile/*` — guarded `GET /profile/me` and `PUT /profile/me`. The update white-list covers
  personal fields only; the bank posting (`bank_name`, `branch_name`, `branch_code`) is set by the
  admin at provisioning time and is **not** self-editable, so an officer cannot reassign
  themselves to another branch.
- `review/*` — guarded review queue and decision workflow: `GET /loans` (forwarded applications
  only, newest handoff first, with `status`/`verificationStatus`/`farmerId`/pagination filters),
  `GET /loans/:id` (timeline + farmer + field-officer + forwarding-officer summaries),
  `POST /loans/:id/review` (`pending` → `under_review`), and `POST /loans/:id/decision`
  (`approved`/`rejected`). See the Milestone 5 log for the authorization boundary and rules.
- `validation.ts` — native validators mirroring the Field Officer module (UUID, bounded text,
  pagination, positive number) plus the bank-specific enums: `BANK_DECISION_STATUSES`
  (`approved`, `rejected` only) and the queue status filter allow-list.

**Schema:** `farmer_db.sql` (profiles, transactions, loan_applications, loan_timeline,
notifications, storage bucket) + `admin.sql` (admin/field-officer/bank-officer columns on
profiles; audit_logs; field_officer_assignments; field_visits; farmer_verifications; loan review
columns; loan decision columns).

**Auth model:** Supabase Auth. Farmers/officers use synthetic email `${nid}@sofol.local`;
admin uses `ADMIN_EMAIL`. Roles resolved server-side from `profiles`, never trusted from the client.

---

## Milestone log

### Milestone 0 — Backend baseline import, audit & documentation
- **Status:** Implemented (baseline + docs).
- Reconciled two backends; adopted TS `server/` (JS `backend/` superseded). Imported the
  server, created `.env.example`, wrote honest README/AI_README.
- **Tests:** server boots; `GET /` 200; protected 401; unknown 404; farmer login (bad creds) 401 (live Supabase).
- **Commits:** `b1548b0`, `c2624a7`, `dd72d28`.

### Milestone 1 — Finish Admin (make it runnable, mounted, verified)
- **Feature:** Bring the existing-but-unreachable admin module online.
- **Status:** Implemented (core admin) + verified live. See role table for the create/update caveat.
- **Files created:** `server/src/modules/admin/audit/{audit.service,audit.controller,audit.routes}.ts`,
  `server/src/modules/admin/admin.routes.ts`, `server/admin.sql`.
- **Files modified:** `server/src/app.ts` (mount `/api/admin`),
  `server/src/modules/admin/dashboard/dashboard.service.ts` (remove debug leak).
- **Purpose:** The admin auth controller and field-officer service imported
  `../audit/audit.service`, which did not exist — importing admin routes crashed the server, so
  they were never mounted. Creating the audit module unblocked mounting.
- **Architecture:** unchanged (modular). Audit logging is best-effort and never throws.
- **Database changes:** `admin.sql` added to the repo (idempotent). The live DB already had this
  schema; no migration was applied by this milestone.
- **API endpoints:** `/api/admin/{auth,dashboard,field-officers,audit}` now mounted.
- **Auth/authz:** all admin routes except `/auth/login` and `/auth/seed` require
  `authenticateUser` + `adminOnly`.
- **Validation:** per-handler field checks; no central schema layer yet.
- **Error handling:** admin handlers use `{ success, message, data }`; audit list degrades to
  empty on Postgres `42P01`.
- **Audit logging:** `recordAuditLog` verified — a real row was written on admin login and read
  back via `GET /api/admin/audit` (live).
- **Frontend integration:** none (deferred).
- **Tests (live Supabase):** admin login `200` (+ audit row written); dashboard/stats `200`;
  `/me` `200`; audit list `200` (real data); field-officers list `200`; all guarded routes `401`
  without a token. Field-officer create/update/status/reset not live-mutation-tested (would seed
  records in the connected DB).
- **Commits:** `0a41189` (audit module), `8c286b2` (admin.sql), `8ba84b7` (mount), `dec1d6c` (dashboard cleanup), + docs.
- **Known issues:** create-path not live-tested; generic user management / reports / settings absent.
- **Next step:** Milestone 2 — Field Officer module (officer-facing routes for farmer
  registration/verification/visits), plus admin ability to create officer accounts end-to-end.

### Milestone 2 — Field Officer core workflow
- **Feature:** Officer profile, assigned farmer management/registration, farmer verification, and
  field visit scheduling/status management.
- **Status:** Implemented and verified live. Loan-application management for the officer and
  frontend API integration are intentionally still pending.
- **Files created:** `server/src/modules/fieldOfficer/fieldOfficer.routes.ts`,
  `server/src/modules/fieldOfficer/validation.ts`, and the profile, farmers, verification, and
  visits controller/route/service files; `server/test/field-officer.e2e.cjs`.
- **Files modified:** `server/src/app.ts` (mount), `server/admin.sql` (idempotent visit and
  verification columns/compatibility repair), `README.md`, and `AI_README.md`.
- **Architecture:** `Route → authenticateUser → fieldOfficerOnly → Controller → Service →
  Supabase`; shared `assertAssigned` scopes farmer operations and visit/verification writes.
- **API endpoints:**
  `GET/PUT /api/field-officer/profile/me`; `GET/POST /api/field-officer/farmers`,
  `GET/PUT /api/field-officer/farmers/:id`; `GET /api/field-officer/verification`,
  `POST /api/field-officer/verification/farmers/:id`,
  `PUT /api/field-officer/verification/:id`; `GET/POST /api/field-officer/visits`,
  `GET/PUT /api/field-officer/visits/:id`, and visit complete/cancel actions.
- **Database changes:** no destructive migration. `admin.sql` adds/repairs `location`,
  `visit_type`, `field_officer_id`, `verification_type`, verification timestamps/arrays/flags,
  and the visit-date index. New farmer registration inserts `profiles` and
  `field_officer_assignments` and rolls back Auth/profile creation when assignment setup fails.
- **Authentication/authorization:** every officer route requires a valid Supabase Bearer token
  and server-resolved `field_officer` role. Farmer access requires an active assignment; visit
  access requires ownership by the current officer; verification updates require both record
  ownership and current assignment.
- **Validation:** shared native validators cover UUIDs, positive pagination, valid dates, enum
  statuses, bounded text, non-negative numeric profile fields, arrays, booleans, passwords, and
  registration identifiers. Privileged request fields are ignored by white-lists.
- **Error handling:** controllers return 400 for invalid input, 401 for missing auth, 403 for
  wrong role, and 404 for nonexistent/unassigned/unowned resources. Audit writes remain
  best-effort and do not block the business action.
- **Audit logging:** farmer registration/update, verification changes, and visit schedule/update/
  complete/cancel actions record an audit row through the existing audit service.
- **Tests:** `npm run build` passed from `server/`; live `node test/field-officer.e2e.cjs` passed
  **31/31** after fresh local tokens were generated. Test-created farmer, visits, verifications,
  assignment, and Auth user were cleaned up afterward. Existing stale-token run is not counted.
- **Frontend integration:** none; existing Expo screens remain local/mock as documented. No Expo
  dependency versions were changed.
- **Known issues:** Field Officer loan-application endpoints are not implemented; frontend API
  services are not wired; Farmer response shapes are still inconsistent; CORS/security hardening
  remains open.
- **Next step:** implement the Field Officer loan-application portion only after confirming the
  existing loan schema/status design, then continue with Farmer backend endpoint verification.

### Milestone 3 — Field Officer loan application workflow
- **Status:** Complete (implemented and verified live; session recovered after an outage —
  the interrupted session had only completed schema probing via `server/scripts/*-probe.cjs`,
  no loan code existed yet).
- **Implemented:** officer-side loan application lifecycle — create draft, list, get,
  update draft, submit, verification verdict, forward to bank.
- **Files created:** `server/src/modules/fieldOfficer/loans/{loans.routes,loans.controller,loans.service}.ts`,
  `server/test/field-officer-loans.e2e.cjs`, `server/test/cleanup.cjs`,
  `server/test/cleanup-sweep.cjs`.
- **Files modified:** `server/src/modules/fieldOfficer/fieldOfficer.routes.ts` (mount `/loans`),
  `server/src/modules/fieldOfficer/farmers/farmers.service.ts` (export
  `fetchAssignedFarmerIdSet` for loan-list scoping), `server/src/modules/fieldOfficer/validation.ts`
  (allow-list the loan business-rule messages), `server/src/modules/farmer/auth/auth.service.ts`
  (login now uses a throwaway Supabase client — see bugfix below), `server/admin.sql`,
  `README.md`, `AI_README.md`.
- **Database:** no destructive migration. `admin.sql` now idempotently layers the officer
  loan-review columns onto `loan_applications` (`field_officer_id`, `verified_at`,
  `verification_notes`, `forwarded_by`, `recommended_amount`) plus farmer/status/verification
  indexes; the live DB already had these columns from before the outage. No new tables.
- **API endpoints:** `GET/POST /api/field-officer/loans`, `GET/PUT /api/field-officer/loans/:id`,
  `POST /api/field-officer/loans/:id/submit`, `POST .../verify`, `POST .../forward`.
- **Status lifecycle:** `draft` (officer-created) → `pending` (submitted by officer; the only
  status transition an officer can perform) → bank-owned statuses (`under_review`, `approved`,
  `rejected`, `active`, `completed`). Officer verification is tracked separately in
  `verification_status` (`pending` → `verified`/`rejected`, `verified_at`, `verification_notes`);
  only `verification_status='verified'` applications can be forwarded (`forwarded_at`,
  `forwarded_by`). Re-verify/re-forward after forwarding is blocked — the application is in
  the bank's domain. All transitions are validated server-side; invalid ones return 400.
- **Authorization:** every route requires a valid Bearer token and server-resolved
  `field_officer` role. `assertAssigned` gates create/read/update/submit/verify/forward to
  the officer's active farmer assignments; lists are scoped via `fetchAssignedFarmerIdSet`.
  A missing loan and a foreign-officer loan both 404 (no existence leak). Protected columns
  (`farmer_id`, `field_officer_id`, `status`, `verification_status`, `forwarded_at/by`,
  `verified_at`, `created_at`) are never client-writable. Verified live with a second
  real officer account: cross-officer get/update/submit/verify/forward/create all 404, and
  the second officer's list is scoped to their own (empty) assignments.
- **Validation:** farmerId/loanId UUIDs, required text (title/duration/purpose) with length
  caps, positive `amount`, non-negative `emi`/`interest`, ISO dates,
  `installmentType` ∈ {monthly, seasonal}, status/verification filter enums, positive
  pagination. Follows the existing native `validation.ts` helpers — no new library.
- **Audit logging:** draft created/updated, submitted, verification verdict, and forward
  all write a best-effort `audit_logs` row (`targetType: 'loan_application'`).
- **Tests:** `npm run build` passes; live `node test/field-officer-loans.e2e.cjs` **44/44**
  and regression `node test/field-officer.e2e.cjs` **31/31** (fresh tokens). Covers create/
  list/get/update/submit/verify/forward success paths, validation failures, invalid state
  transitions, IDOR scenarios, wrong-role and unauthenticated access, plus persistence
  (timeline rows, `field_officer_id` stamping). Test-created farmers, officers, loans,
  timelines, visits, and auth users were removed afterward (verified clean DB).
- **Bugfix (pre-existing, blocking):** farmer/officer login (`POST /api/farmer/auth/login`)
  called `signInWithPassword` on the shared `supabase` singleton, installing that user's
  session in memory — every later service query then ran under the user's JWT and hit RLS
  ("Forbidden: User role not found" cascade). Login now signs in on a throwaway client, so
  the shared client keeps using the service-role key.
- **Bonus verified live:** admin field-officer **create** and **reset-password** (previously
  untested paths) were exercised during test setup and worked.
- **Known limitations:** officer `date` field is stored as ISO string (UI uses formatted
  strings); farmer-app-created applications start at `pending` with no officer draft step;
  farmer-module response shapes remain inconsistent; frontend not wired.
- **Next milestone:** Farmer backend (endpoint verification/response standardization).

### Milestone 4 — Farmer backend (hardening, credit profile, verification)
- **Status:** Complete (all farmer data endpoints hardened, validated, ownership-scoped,
  and verified live; no destructive DB change).
- **Implemented:** farmer profile `GET/PUT /api/farmer/me` (+ `/profile` alias) with the
  response contract standardized to `{ success, message, data }`; a read-only farmer
  credit-profile endpoint; hardened transactions (validation, whitelisted update columns,
  sign-convention amounts); hardened loan apply (validation, pinned `pending` status,
  audit logging); safe error mapping (no raw Supabase/PGRST errors leak).
- **Files created:** `server/src/modules/farmer/validation.ts`,
  `server/src/modules/farmer/credit/{credit.service,credit.controller,credit.routes}.ts`,
  `server/test/farmer.e2e.cjs`.
- **Files modified:** farmer `profile/`, `transactions/`, `loans/` controllers+services,
  `farmer.routes.ts` (mounts `/me`, `/credit`), `test/cleanup.cjs` (farmer-milestone
  records), `README.md`, `AI_README.md`.
- **Database:** unchanged — reuses `profiles`, `transactions`, `loan_applications`,
  `loan_timeline`, `notifications`, `farmer_verifications` as-is. No migration needed.
- **API endpoints:** `GET/PUT /api/farmer/me` (alias `/profile`), `GET /api/farmer/credit`,
  plus the pre-existing (now hardened) `GET/POST /api/farmer/transactions`,
  `GET/PUT/DELETE /api/farmer/transactions/:id`, `GET/POST /api/farmer/loans`,
  `GET /api/farmer/loans/:id`.
- **Authentication:** Bearer Supabase token via `authenticateUser` (unchanged).
- **Authorization:** every farmer data route runs behind `farmerOnly`; `farmer_id` is
  always derived from the token — a client-supplied `farmerId`/`farmer_id` is ignored on
  create and update. Reads/updates/deletes are scoped by `farmer_id`, so a foreign row is
  indistinguishable from a missing one (404). Verified live with two real farmers: A→A
  allowed, A→B rejected (404) on transactions and loans; lists never leak cross-farmer
  rows. Wrong-role (officer token) access is 403.
- **Validation:** UUIDs (transaction/loan ids), required text with length caps, positive
  loan amounts, non-negative emi/interest, `installmentType ∈ {monthly, seasonal}`,
  `category ∈ {income, expense}` with the signed-amount convention (income > 0,
  expense < 0), required transaction dates (display-string format per frontend
  convention). Business-rule failures → 400, missing/foreign → 404, auth → 401/403.
- **Business rules:** privileged profile columns (`is_verified`, `credit_score`,
  `farmer_id`, `role`, `status`, `member_since`) are filtered out of farmer updates
  (mass-assignment guard, verified live); loan `status`/`verification_status` from the
  client are ignored — applications enter as `pending` in the shared lifecycle; officer
  verification and bank decisions are only writable through their own role endpoints; the
  credit profile is strictly read-only (no write route exists).
- **Tests:** `npm run build` passes; live `node test/farmer.e2e.cjs` **64/64** with
  regressions `field-officer.e2e.cjs` **31/31** and `field-officer-loans.e2e.cjs`
  **44/44** (fresh tokens). Covers profile read/update + mass-assignment guards,
  transactions CRUD + validation + IDOR, loans list/get/apply + status pinning + IDOR,
  credit profile structure + verified-field protection + IDOR, dashboard regression, and
  401/403 auth guards. Test-created farmers, transactions, loans, timelines, and auth
  users removed afterward (verified clean DB).
- **Known limitations:** `dashboard` still returns a bare payload (not the full contract);
  transaction `date` is a display string ("18 Jun 2024") per the existing frontend
  convention — ISO normalization is a future cross-cutting change; frontend contexts
  (Profile/Transaction/Loan/Notification) still use local mock data.
- **Next milestone:** Bank Officer Backend.

### Milestone 5 — Bank Officer backend (loan review & decision)
- **Status:** ⚠️ **Implemented but NOT live-verified.** All code is written and
  `npm run build` (tsc) passes. **Zero endpoints have been executed.** Two things
  block verification and both are still outstanding:
  1. The `admin.sql` bank-officer block has **not** been applied to the connected
     Supabase project. Confirmed live: `loan_applications.bank_officer_id`,
     `reviewed_at`, `decision_at`, `decision_notes`, `approved_amount` and
     `profiles.bank_name`, `branch_name`, `branch_code` all return Postgres
     `42703 column does not exist`. `supabase-js` cannot run DDL, so this must be
     pasted into the Supabase SQL editor by hand.
  2. `server/test/bank-officer.e2e.cjs` has therefore never been run — the
     assertion count below is the number of checks *written*, not passed.
  Per the golden rule at the top of this file, nothing here may be described as
  working until it has actually been run.
- **Scope decision:** review/decision only. Disbursement (`approved` → `active`) and
  repayment tracking (`→ completed`) were explicitly deferred; those statuses exist in
  the lifecycle but **no endpoint in this module can set them**.
- **Files created:** `server/src/middleware/bankOfficer.middleware.ts`,
  `server/src/modules/bankOfficer/validation.ts`,
  `server/src/modules/bankOfficer/bankOfficer.routes.ts`,
  `server/src/modules/bankOfficer/profile/{profile.service,profile.controller,profile.routes}.ts`,
  `server/src/modules/bankOfficer/review/{review.service,review.controller,review.routes}.ts`,
  `server/src/modules/admin/officerAccounts.ts`,
  `server/src/modules/admin/bankOfficers/{bankOfficers.service,bankOfficers.controller,bankOfficers.routes}.ts`,
  `server/test/bank-officer.e2e.cjs`.
- **Files modified:** `server/admin.sql`, `server/src/app.ts` (mount `/api/bank-officer`),
  `server/src/modules/admin/admin.routes.ts` (mount `/bank-officers`),
  `server/test/cleanup.cjs` (bank-milestone records), `README.md`, `AI_README.md`.
- **Prerequisite added on purpose:** the `bank_officer` role previously had **no** way to
  come into existence — the admin module only created field officers. Without
  `POST /api/admin/bank-officers` the entire module would be unreachable and untestable,
  so provisioning (create/list/status) was implemented as part of this milestone rather
  than left in the backlog.
- **Database:** additive and idempotent, no destructive migration. `admin.sql` now adds
  `profiles.bank_name/branch_name/branch_code` and, on `loan_applications`,
  `bank_officer_id` (FK → profiles), `reviewed_at`, `decision_at`, `decision_notes`,
  `approved_amount`, plus `loan_applications_forwarded_at_idx` (the queue's filter +
  ordering) and `loan_applications_bank_officer_idx`. No new tables. The bank columns are
  kept separate from the officer's `verification_*` columns so the two verdicts can never
  be conflated.
- **API endpoints:** `GET/PUT /api/bank-officer/profile/me`;
  `GET /api/bank-officer/loans`, `GET /api/bank-officer/loans/:id`,
  `POST /api/bank-officer/loans/:id/review`, `POST /api/bank-officer/loans/:id/decision`;
  plus admin-side `GET/POST /api/admin/bank-officers` and
  `PATCH /api/admin/bank-officers/:id/status`.
- **Status lifecycle (bank half):** `pending` → `under_review` → `approved` | `rejected`.
  A decision may also be taken straight from `pending` without an explicit review step.
  `draft`, `pending`, `active` and `completed` are all rejected (400) as decision values.
- **Authorization boundary (the important part):** the bank sees **only applications a field
  officer has forwarded** (`forwarded_at is not null`). `assertForwardedLoan` raises the
  *same* `Loan application not found` error for a nonexistent id, a draft, and a
  submitted-but-not-forwarded application, so all three return 404 and the bank cannot
  enumerate the upstream pipeline. Every route requires a valid Bearer token plus a
  server-resolved, **active** `bank_officer` profile.
- **Queue scoping — documented design decision:** all bank officers share one queue. There
  is no branch/portfolio assignment table in the schema, so per-officer scoping would be
  invented rather than modelled; who actually acted is recorded in `bank_officer_id`. This
  is intentionally different from the Field Officer module, which *is* scoped by
  `field_officer_assignments`. If per-branch scoping is wanted later it needs a real
  assignment table, not a filter.
- **Business rules:** a decision requires `verification_status === 'verified'` (defence in
  depth — forwarding already requires it, but a later verification change must not leave an
  approvable application); an already-decided application cannot be re-decided (400), so an
  approval cannot be quietly flipped to a rejection; a rejection **must** carry `notes` and
  **must not** carry `approvedAmount`; `approvedAmount` defaults to the officer's
  `recommended_amount` (else the requested `amount`), must be > 0, and **can never exceed
  the requested amount** — a bank may sanction less, never more.
- **Protected columns:** the decision endpoints write only `status`, `reviewed_at`,
  `decision_at`, `decision_notes`, `approved_amount`, `bank_officer_id`, `updated_at`.
  `farmer_id`, `amount`, `field_officer_id`, `verification_status`, `verified_at`,
  `verification_notes`, `forwarded_at`, `forwarded_by`, `recommended_amount` and
  `created_at` are never read from the request body.
- **Validation:** loan id UUIDs, decision status enum, `notes` bounded to 2000 chars,
  positive `approvedAmount`, positive pagination, queue status/verification filter enums.
  Native helpers only — no new dependency.
- **Audit logging:** best-effort `audit_logs` rows with `module: 'BankOfficer'` for
  under-review, approve/reject (including requested vs approved amount), bank-officer
  creation, and status changes.
- **Timeline + notifications:** the field officer's submit step seeds three timeline rows;
  the bank closes step 2 on review and step 3 on decision (relabelled `Approved`/`Rejected`).
  The farmer is notified at both points. Both are best-effort and never roll back the
  decision, matching the existing submit/verify/forward behaviour.
- **Tests:** `server/test/bank-officer.e2e.cjs` — ~80 written assertions covering admin
  provisioning (create/duplicate/short-password/list/status/401/403), profile read/update +
  mass-assignment guard, queue contents and the exclusion of draft and not-forwarded
  applications, all filter validation, detail + timeline, both state transitions, every
  business-rule rejection, protected-column injection, cross-role 401/403 in both
  directions, immediate lockout of a suspended officer, and the farmer-visible outcome.
  The suite is **self-provisioning**: it obtains an admin token from the public
  `POST /api/admin/auth/login` using `ADMIN_EMAIL`/`ADMIN_PASSWORD` and creates its own
  field officer, two bank officers and farmer, so unlike the older suites it does **not**
  read the stale `scripts/token.tmp` / `test/admin_token.tmp` files and cannot fail on an
  expired token. `test/cleanup.cjs` was extended to remove its records
  (`bank-cleanup.tmp`), deleting loans before officers because `loan_applications` holds FKs
  to both. **None of this has been executed.**
- **Known limitations:** not live-verified (see Status); no bank-officer dashboard/analytics;
  no `PUT`/reset-password for bank officers (only create/list/status);
  `officerAccounts.ts` is used by the bank path only while `fieldOfficers.service.ts` keeps
  its own copies of the same helpers; frontend not wired.
- **Next step:** apply the `admin.sql` bank-officer block to the live project, then run
  `node test/bank-officer.e2e.cjs` plus the three existing suites as regressions, clean up,
  and only then update this entry to "verified live".

---

## Audit findings (updated)

1. **Two backends existed.** TS `server/` adopted; JS `backend/` superseded — recommend removal. *(open)*
2. ~~Response contract mismatch.~~ **Mostly fixed (Milestone 4)** — farmer data endpoints
   now return `{ success, message, data }`; farmer `dashboard` still returns a bare payload. *(nearly closed)*
3. ~~Admin routes not mounted.~~ **Fixed (Milestone 1)** — mounted at `/api/admin`.
4. ~~Missing admin schema / audit module.~~ **Fixed (Milestone 1)** — `admin.sql` + `audit/` added.
5. **CORS is `*`.** Must be scoped before production. *(open)*
6. **Security hardening absent.** No helmet, no rate limiting. *(open)*
7. **`tsconfig` `types: []`.** `tsc --noEmit` can error on Node globals; runtime uses `--transpile-only`. *(open)*
8. **Unused deps.** `jsonwebtoken`, `bcryptjs` unused (auth is Supabase-based). *(open)*
9. ~~Field Officer loan workflow.~~ **Fixed (Milestone 3)** — officer-facing loan application
   create/list/get/update/submit/verify/forward is implemented and verified live; the
   officer loan screen remains local/mock until frontend wiring. *(frontend part open)*
10. ~~Shared-client session leak on farmer login.~~ **Fixed (Milestone 3)** —
   `POST /api/farmer/auth/login` used to poison the shared Supabase client with the
   logged-in user's session (later requests ran under the user's JWT and hit RLS).
   Login now uses a throwaway client.
11. ~~Bank Officer role had no provisioning path.~~ **Fixed (Milestone 5)** —
   `POST /api/admin/bank-officers` + `PATCH /:id/status` added. *(not yet live-verified)*
12. **Milestone 5 schema is not applied to the live project.** The `admin.sql`
   bank-officer block exists in the repo but the connected Supabase database still
   returns `42703` for every new column, so `/api/bank-officer/loans` degrades to an
   empty queue and every write path would fail. **This is the single blocking item.**
   `supabase-js` cannot execute DDL — the block must be run in the Supabase SQL editor.
   *(open)*
13. **Schema is applied by hand, with no migration history.** `farmer_db.sql` and
   `admin.sql` are idempotent scripts pasted into the SQL editor; there is no
   `supabase/migrations/` directory and nothing records which project is at which
   revision. Milestone 5 is the first time this caused a hard stop. Adopting the
   Supabase CLI with real migrations would remove the manual step. *(open)*

---

## Cross-cutting backlog

- **Apply the `admin.sql` bank-officer block to the live project and run
  `node test/bank-officer.e2e.cjs` + the three existing suites** (blocking; see audit
  finding 12).
- Adopt versioned migrations instead of hand-pasted SQL (audit finding 13).
- Standardize `{ success, message, data }` across farmer handlers.
- Add central request validation (Zod available).
- Add security middleware: `helmet`, rate limiting, scoped CORS.
- Admin: generic user management (all roles), reports, settings; bank-officer `PUT` and
  reset-password (create/list/status exist as of Milestone 5).
- Migrate `fieldOfficers.service.ts` onto the shared `officerAccounts.ts` helpers so
  `normalizePhone` / `findOrphanAuthUser` exist once instead of twice.
- Live-test the remaining Admin field-officer update/status paths (create and reset-password were verified live in Milestone 3 setup).
- Standardize/extend automated tests across Farmer, Bank Officer, and Admin APIs.
- Backport the self-provisioning token approach from `bank-officer.e2e.cjs` to the older
  suites so they stop depending on stale `*.tmp` bearer tokens.
- Remove the superseded JS `backend/` skeleton.

---

## Conventions for future sessions

- Branch: `feature/akash` only. Never push to `main`.
- One logical feature per commit; commit + push after each milestone.
- Update **both** `README.md` and `AI_README.md` every milestone.
- Never commit `.env` or hardcode secrets. Keep `.env.example` current.
- Enforce roles server-side; never trust a client-supplied role.
- Do not document anything as implemented unless it actually works.
