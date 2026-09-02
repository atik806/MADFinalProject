# SOFOL — AI Development Context (technical memory)

This file is the durable, honest engineering log for the SOFOL backend. It records what is
**actually implemented and verified**, what is partial, and what is planned — so any future
session can resume without guessing. Human-facing setup lives in [README.md](README.md).

**Golden rule:** nothing is documented as "Implemented" unless it has been run and works.

---

## Project architecture

- **Frontend** — Expo (SDK 56) / React Native / TypeScript at the repo root (`src/`).
  File-based routing (`expo-router`), state in React Context. Farmer, field-officer and
  admin screens run on the real backend through the typed client in `src/lib/api.ts`
  with response contracts in `src/lib/api-types.ts`; bank-officer screens remain
  local/mock (parked schema).
- **Backend** — Express 5 + TypeScript in `server/`. Modular:
  `server/src/modules/<role>/<feature>/{controller,routes,service}`. All business logic and
  the only Supabase access live here.
- **Supabase** — Auth + Postgres + Storage. The server uses the **service-role** client
  (`server/src/config/supabase.ts`), which bypasses RLS; the key is server-only.

**Request flow:** Route → Middleware (`authenticate` → role guard) → Controller → Service → Supabase.

**Response contract:** target is `{ success, message, data }`.
> The **admin** module already returns `{ success, message, data }`. The **farmer** module's
> data endpoints all return `{ success, message, data }` — `dashboard` was the last hold-out
> and was standardized in the Milestone 4 follow-up. The **field officer** and
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
| Admin         | Implemented (core) — **verified live this milestone (57/57)** | auth (login/me/change-password/seed), dashboard (stats incl. bank-officer counts/trends/loan-analytics/recent-activity/overview), audit trail, field-officer management (list/get/create/update/status/reset — create + status now live-tested), bank-officer management (list/get/create/status — create blocked by parked schema), and the **unified user directory** (`GET /users`, `GET /users/:id`, `PATCH /users/:id/status`) plus **farmer directory** (`GET /farmers`, `GET /farmers/:id`) are mounted at `/api/admin` and verified live by `server/test/admin.e2e.cjs` (57/57, self-provisioning). Reports and settings screens remain planned. |
| Farmer        | Implemented (backend + frontend, verified live) | auth (register/login/reset/upload/me), profile (`GET/PUT /me` + `/profile` alias, privileged columns filtered), read-only credit profile, dashboard, transactions (full CRUD, whitelisted updates, sign-convention amounts), loans (list/get/apply, pinned `pending`, shared lifecycle), notifications — mounted at `/api/farmer` and verified live (farmer E2E 72/72). Frontend wired (typed contexts, loading/error/retry states, double-submit guards, session-scoped caches). |
| Field Officer | Implemented (core + loans, backend + frontend) | Profile, assigned-farmer management/registration, verification history/update, field visits, and the loan-application workflow (draft → submit → verify → forward) are mounted at `/api/field-officer` and verified live (50/50 + 48/48). Frontend wired (dashboard with real counts/officer profile, visits with farmer-name resolution, applications with verify/forward). |
| Bank Officer  | **Implemented (backend) — NOT live-verified (schema blocked)** | Profile (`GET/PUT /profile/me`), forwarded-application review queue, application detail, `pending → under_review`, and the `approved`/`rejected` decision are written, type-checked (`npm run build` passes) and mounted at `/api/bank-officer`. The 89-assertion E2E suite exists and has been **desk-checked line-by-line against the implementation** (routes, guards, state transitions, validation messages, cleanup ordering all match), but **has never been executed**: the `admin.sql` bank-officer columns are still absent from the connected Supabase project (Postgres `42703` on all 8 — re-probed this session, twice, 45s apart to rule out schema-cache lag). The owner is applying the block via the SQL editor; live verification resumes the moment the columns exist. Treat every behaviour below as *intended and reviewed*, not *proven*. Disbursement and repayment are out of scope. |

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
- `admin.routes.ts` — barrel: `/auth`, `/dashboard`, `/field-officers`, `/bank-officers`,
  `/users`, `/farmers`, `/audit`.
- `auth/*` — `POST /login` (public, self-seeds admin), `POST /seed` (public, idempotent),
  `GET /me`, `POST /change-password` (guarded). Admin creds from `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- `dashboard/*` — `GET /stats` (now including `totalBankOfficers`/`activeBankOfficers`),
  `/registration-trend`, `/loan-analytics`, `/recent-activity`, `/overview` (guarded). Counts
  degrade to 0 on missing tables via `safeCount` — which, until Milestone 6, silently returned
  0 for *everything* (see the bugfix below).
- `fieldOfficers/*` — `GET /` (list, paginated/search/filter), `GET /:id`, `POST /` (create),
  `PUT /:id`, `PATCH /:id/status`, `POST /:id/reset-password` (guarded). Creates a
  `field_officer` auth user + profile; edits via a field white-list.
- `bankOfficers/*` — `GET /` (list + per-officer decision count), `GET /:id` (role-scoped
  detail; decision count degrades to 0 while the bank schema is parked), `POST /` (create —
  blocked live by the parked schema), `PATCH /:id/status` (guarded). Exists because the
  `bank_officer` role had **no** provisioning path at all: without it `/api/bank-officer`
  is unreachable. Status changes are the admin's kill switch for an officer who holds
  approval authority.
- `users/*` — **Milestone 6.** Unified directory over `profiles` for ALL roles:
  `GET /` (paginated; role/status filters; search on name/email/phone/farmer_id/employee_id,
  with ilike-wildcards escaped), `GET /:id` (any role, full profile), and
  `PATCH /:id/status` (active/inactive/suspended). Status changes are refused for
  `admin` rows — the primary admin is env-configured and has no recovery path if locked
  out. Directory rows deliberately exclude NID; bank-officer posting columns are resolved
  per-record in detail views so the parked schema cannot break the whole listing.
- `farmers/*` — **Milestone 6.** Read-only admin farmer directory: `GET /` (search on
  name/phone/email/farmer_id/village/upazila; district, verification, status filters) and
  `GET /:id` (full profile + last 20 officer verification records). No write path:
  verification belongs to the field-officer flow and account status lives in `users/*`.
- `officerAccounts.ts` — shared staff-provisioning primitives (`normalizePhone`, `shortHex`,
  `findOrphanAuthUser`, `createOfficerAuthUser`) so a second officer type cannot drift from the
  established behaviour. Currently used by `bankOfficers` only; migrating `fieldOfficers` onto it
  is backlog.
- `audit/*` — `recordAuditLog` (best-effort insert) + `GET /` (paginated audit trail, guarded).
  User-status changes are audited (`User status set to <status>`, module `Admin`,
  target_type `user`).

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
— *written and type-checked, E2E desk-checked, not yet executed live (schema blocked)*:
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
- **Known limitations:** ~~`dashboard` still returns a bare payload~~ *(closed in the
  follow-up below)*; transaction `date` is a display string ("18 Jun 2024") per the
  existing frontend convention — ISO normalization is a future cross-cutting change;
  frontend contexts (Profile/Transaction/Loan/Notification) still use local mock data.

### Milestone 4 follow-up — dashboard contract + admin-auth session leak
- **Status:** Complete and verified live (72/72).
- **Why:** a re-run of the Farmer milestone surfaced two real defects the earlier suites
  could not catch, because they read pre-generated token files instead of exercising the
  login endpoints.
- **Defect 1 (high severity, pre-existing):** `loginAdmin` called `signInWithPassword` on
  the shared `supabase` singleton — the exact session-poisoning class fixed for the farmer
  login in Milestone 3, but missed on the admin path. After any admin login, every later
  service query in the process ran under the admin's JWT instead of the service-role key
  and failed RLS, breaking farmer registration (`new row violates row-level security
  policy for table "profiles"`) server-wide until a restart. Fixed with the same
  throwaway-client pattern (`admin/auth/auth.service.ts`); verified live by logging in as
  admin and then registering a farmer in the same server process (201).
- **Defect 2:** `GET /api/farmer/dashboard` was the one farmer endpoint off the
  `{ success, message, data }` contract; it also passed `error.message` through raw and
  mapped a missing user to 500 instead of 401. Controller now mirrors the credit
  controller (contract, 401/404/500 mapping via `safeErrorMessage`); the service takes a
  required farmer id, scopes by role `farmer`, uses `maybeSingle` and throws a clean
  `Farmer profile not found`.
- **Files modified:** `server/src/modules/admin/auth/auth.service.ts`,
  `server/src/modules/farmer/dashboard/{dashboard.controller,dashboard.service}.ts`,
  `server/test/farmer.e2e.cjs`, `server/test/cleanup.cjs`.
- **Test hardening:** the farmer suite no longer depends on
  `scripts/token.tmp`/`test/admin_token.tmp`. It resolves its field-officer token lazily:
  a working token file is reused; otherwise a throwaway field officer is provisioned via
  the admin API and removed by `cleanup.cjs`. The cleanup manifest is written eagerly so
  an early abort can no longer leak a provisioned officer (one leaked officer from the
  first aborted run was removed by hand and the leak fixed).
- **Tests:** `npm run build` passes; live `node test/farmer.e2e.cjs` **72/72** (dashboard
  contract, ownership scoping, 401/403, plus all prior coverage). Admin surface
  regression after the auth change: login `/me`, `dashboard/stats`, `dashboard/overview`,
  `audit`, `field-officers`, `bank-officers` all 200; unauthenticated 401. DB verified
  back to its pre-run baseline after cleanup (only the standing admin/officer/farmer
  records remain).
- **Commits:** `1347f2a` (admin-auth poisoning fix), `7dcc85d` (self-provisioning
  test tokens), `86d6a29` (dashboard contract).
- **Next milestone:** Bank Officer Backend.

### Milestone 6 — Admin backend (user directory, farmer directory, status enforcement)
- **Status:** Complete and **verified live** — `npm run build` passes;
  `node test/admin.e2e.cjs` **57/57** (run twice back-to-back, both green);
  farmer regression `node test/farmer.e2e.cjs` **72/72**; DB verified back to
  its exact baseline after cleanup.
- **Architecture:** unchanged — Route → authenticateUser → adminOnly →
  Controller → Service → Supabase. No new tables, **no DDL applied**
  (the bank-officer schema remains parked by owner decision).
- **Why a unified users module:** the admin could manage officers through two
  role-specific routers but had no view of farmers or the account list as a
  whole, and — worse — suspending an officer did not actually revoke API
  access because `farmerOnly`/`fieldOfficerOnly` never read `profiles.status`.
- **Implemented:**
  1. **Status enforcement (the teeth):** `farmerOnly` and `fieldOfficerOnly`
     now re-read `profiles.status` on every request, mirroring
     `bankOfficerOnly`. `inactive`/`suspended` → 403 immediately, with the
     token still cryptographically valid; `pending` still passes because it is
     the farmer registration default. Verified live in both directions
     (suspend → 403, reactivate → 200).
  2. **User directory:** `GET /api/admin/users` (paginated; role
     farmer/field_officer/bank_officer/admin; any-status filter; ilike search
     with `%`/`_` escaped), `GET /api/admin/users/:id`,
     `PATCH /api/admin/users/:id/status` (active/inactive/suspended only).
     Status changes on `admin` rows are refused server-side — the primary
     admin is env-configured with no lockout recovery path. Verified live.
  3. **Farmer directory (read-only):** `GET /api/admin/farmers` (search on
     name/phone/email/farmer_id/village/upazila; district + verification +
     status filters) and `GET /api/admin/farmers/:id` (full profile + last 20
     officer verification records). Role-scoped: another role's id → 404.
     No write path by design — verification belongs to the field-officer
     flow, account status lives in the users module.
  4. **Bank-officer detail:** `GET /api/admin/bank-officers/:id` (role-scoped;
     decision count degrades to 0 while the parked bank columns are absent).
  5. **Dashboard:** `totalBankOfficers`/`activeBankOfficers` added to
     `/stats` (role-scoped profile counts only — no parked-column dependency).
- **Bug fixed (pre-existing, high impact — Milestone 1 vintage):**
  `safeCount` received the query as a *thunk* and did `await query` — awaiting
  an un-invoked function yields the function itself, so the destructured
  `count`/`error` were both `undefined` and **every dashboard count silently
  returned 0 since the dashboard was first written**. The old "verified live"
  claims for `/stats` only ever checked HTTP 200, never the numbers. The fix
  invokes the thunk (`await query()`); the E2E now asserts real numbers
  against fixtures, so this class of silent-zero cannot regress unnoticed.
  Caught when the new admin suite's `totalFarmers >= 1` assertion failed
  against a database that demonstrably had farmers.
- **Files created:** `server/src/modules/admin/users/{validation,users.service,users.controller,users.routes}.ts`,
  `server/src/modules/admin/farmers/{farmers.service,farmers.controller,farmers.routes}.ts`,
  `server/test/admin.e2e.cjs`.
- **Files modified:** `server/src/middleware/{role,fieldOfficer}.middleware.ts`
  (status enforcement), `server/src/modules/admin/admin.routes.ts` (mount
  `/users`, `/farmers`), `server/src/modules/admin/bankOfficers/*` (detail),
  `server/src/modules/admin/dashboard/dashboard.service.ts` (bank counts +
  safeCount fix), `server/test/cleanup.cjs` (`admin-cleanup.tmp` support),
  `README.md`, `AI_README.md`.
- **API endpoints:** `GET /api/admin/users`, `GET /api/admin/users/:id`,
  `PATCH /api/admin/users/:id/status`, `GET /api/admin/farmers`,
  `GET /api/admin/farmers/:id`, `GET /api/admin/bank-officers/:id`; plus the
  extended `GET /api/admin/dashboard/stats`.
- **Authentication/authorization:** every new route sits behind
  `authenticateUser` + `adminOnly`; roles are read server-side from
  `profiles`, never from the client (the E2E injects `role: 'admin'` in a
  status-change body and asserts it is ignored). Verified live: no token →
  401; farmer/officer tokens → 403 on every admin route; suspended users →
  403 on their own role routes.
- **Validation:** shared `users/validation.ts` — UUIDs, positive pagination,
  bounded+escaped search, role/status enums, per-role status transition rules
  (`USER_STATUS_RULES`), safe-error mapping. Raw Supabase errors never reach
  the client.
- **Audit logging:** user-status changes write a best-effort
  `audit_logs` row (`User status set to <status>`, `module: 'Admin'`,
  `targetType: 'user'`, with previous/new status in `details`). The E2E
  reads the trail back through `GET /api/admin/audit` to confirm.
- **Tests:** `server/test/admin.e2e.cjs` — 57 assertions, self-provisioning
  (admin token via `ADMIN_EMAIL`/`ADMIN_PASSWORD`; creates its own field
  officer + farmer through the real APIs). Covers directory list/get/search/
  filters/validation, status transitions + live enforcement on real tokens,
  admin-lockout refusal, farmer directory + role-scoping, bank-officer
  degraded paths, dashboard real numbers (the safeCount regression guard),
  audit trail read-back, and cross-role authorization. Cleanup manifest
  **merges** across runs so consecutive runs cannot orphan fixtures.
- **Known limitations:** bank-officer *create* remains blocked by the parked
  schema (list/detail/status verified on their degraded empty path); officer
  `PUT`/reset-password live-mutation coverage still pending; admin reports and
  settings screens not modelled; frontend not wired.
- **Next milestone:** Frontend API Integration (pending owner decision), or
  Bank Officer live verification once the schema is applied.

### Milestone 7 — Frontend API integration (all wired roles onto the real backend)
- **Status:** Implemented; frontend typecheck and lint at their pre-milestone
  baseline (two long-standing web-only CSS-module errors and one warning in an
  unrelated untracked file remain; they predate this milestone and were verified
  failing at the baseline commit too). Backend untouched: `npm run build` passes,
  `admin.e2e.cjs` 57/57 and `farmer.e2e.cjs` 72/72 against the running server,
  fixtures cleaned afterwards. No DB/SQL change of any kind.
- **API client (`src/lib/api.ts`):** thin `fetch` wrapper — injects the Bearer
  token from the auth context, prefixes the configured base URL, normalizes the
  backend's `{ success, message, data }` envelope and non-2xx bodies into a
  single `ApiError` with status + message, and on 401 clears the session and
  routes to login (a second guard behind the auth context's own expiry check).
- **Authentication (`AuthContext`):** real login against the role login routes,
  server-side role mapping, persisted session, logout clears tokens; expired or
  revoked tokens surface the API's message instead of a generic failure.
- **Farmer workflows:** profile/credit/transactions/loans/notifications/
  dashboard contexts and screens replaced mock arrays with live calls
  (`LoanContext` owns the loan pipeline incl. timeline rows; `ProfileContext`
  powers read + edit; `TransactionContext` adds/list; `NotificationContext`
  list/read). Apply-loan posts to the API; application detail swaps the
  status-derived timeline for the server's real timeline once loaded.
- **Field Officer workflows:** dashboard (assigned farmers + scheduled visits),
  field visits (list + record outcomes), loan applications (list, verify, forward
  — the officer's own scoped queue). All officer writes hit the real endpoints
  and reload the affected list from the server on success.
- **Admin workflows:** dashboard (stats/registration-trend/loan-analytics via
  one parallel fetch), user directory (role-tabbed, server-side search debounced
  300 ms, status suspend/reactivate), field-officer provisioning (create is
  fixed to the only role the backend can provision — NID/phone/temporary
  password required), and audit logs (module values collapsed to the screen's
  three categories, relative timestamps computed client-side). The admin users
  form cannot promise a role the API refuses (bank-officer create is blocked by
  the parked schema; farmers self-register).
- **Deliberately unchanged:** bank-officer screens (schema parked); no endpoint
  was modified server-side; no schema, no DDL, no seed data. Screens keep
  loading skeletons, pull-to-refresh, and now explicit load-error states with
  retry-on-refresh instead of silently empty lists.
- **Frontend conventions adopted:** all data-fetch effects defer their kickoff
  (debounce/timeout) so no `setState` runs synchronously in an effect body —
  `react-hooks/set-state-in-effect` is clean; loaders set terminal state only
  after the fetch resolves.
- **Files created:** `src/lib/api.ts`.
- **Files modified (contexts):** `AuthContext`, `LoanContext`, `NotificationContext`,
  `ProfileContext`, `TransactionContext`.
- **Files modified (screens):** farmer dashboard, loans list, apply-loan,
  application-detail, transactions, add-transaction, notifications, profile,
  edit-profile; field-officer dashboard, field-visits, loan-applications; admin
  dashboard, admin-users, audit-logs.
- **Known limitations:** field-officer and field-officer-loans E2E suites remain
  blocked on their stale-token dependency (pre-existing backlog); Bank Officer
  frontend remains local/mock pending the parked schema; officer edit maps only
  the fields the backend's update white-list accepts.
- **Next step:** Bank Officer schema application + live verification (owner
  action), then the Bank Officer frontend wiring as its own milestone.

### Milestone 8 — Backend hardening, reliability & test completion
- **Status:** Complete — all four runnable E2E suites pass live (admin 71/71,
  farmer 72/72, field-officer 43/43, field-officer-loans 48/48 = 234
  assertions), the database returns to its exact baseline after every run
  (3 profiles / 1 loan / 3 transactions), and the frontend checks are
  unchanged at their pre-existing baseline. **Zero schema, DDL, or SQL
  changes. Bank Officer schema remains parked** (untouched; not attempted).
- **Security middleware (`server/src/middleware/security.middleware.ts`,
  wired in `app.ts`):**
  - **CORS:** allow-list via `CORS_ORIGINS` (comma-separated; empty = Expo
    dev origins localhost:8081/19006, 127.0.0.1:8081, exp://localhost:19000).
    Replaced the blanket `origin: '*'`. Verified live: allowed origin echoes
    + full preflight headers; disallowed origin gets no ACAO header.
  - **Helmet:** default header suite (CSP, HSTS, nosniff, frame protection)
    with COEP disabled so the Expo web client works cross-port. Verified
    live on responses.
  - **Rate limiting:** `express-rate-limit`, per-IP 15-min window,
    env-tunable. Tier 1 `authLimiter` (default 100) on farmer
    register/login/reset-password + admin login/seed. Tier 2
    `adminMutationLimiter` (default 60) on admin officer
    create/update/status/reset-password, bank-officer create/status, and
    user status changes. Verified live: 429 with a generic message +
    Retry-After, no internals. Deliberately NOT a global limiter so normal
    usage / E2E cannot be broken by low-volume clients.
  - **Body limits:** `express.json({ limit: '1mb' })`; 413 for oversized
    bodies (verified live), safe 400 for malformed JSON. Multer uploads
    already capped at 5 MiB.
- **Error hygiene (every controller):** the existing `safeErrorMessage` +
    `statusFor` convention was extended to the remaining leaky handlers —
    admin (auth, dashboard, audit, bankOfficers, fieldOfficers), farmer
    (auth, notifications). Business-rule messages pass; raw
    Supabase/Postgres text (schema details, 42703s, RLS text) is masked
    behind stable generic messages. The global error handler no longer
    prints/passes stack traces.
- **Authorization matrix re-verified live** (all in suites): no token 401;
    malformed/expired token 401; farmer→admin 403; farmer→FO 403; FO→admin
    403; admin→FO 403; suspended farmer/FO blocked 403 **with a still-valid
    token**; reactivation restores access with the SAME token; invalid
    UUID 400; invalid enum 400; invalid pagination 400; client-supplied
    role ignored on mutations; admin-row status lockout refused.
- **IDOR re-verified live:** officer B (real officer, no assignment) gets
    404 on officer A's loans for get/update/submit/verify/forward/create,
    and an empty scoped list — the UUID being valid is not enough.
- **Officer mutation coverage (new in admin E2E, +14 assertions):** admin
    field-officer PUT (success, white-list ignores role/status/nid
    injection, nonexistent 404, invalid UUID 400, no-fields 400, officer
    token survives admin edit), reset-password (success, rotated password
    login works, short 400, nonexistent 404, no-token 401), cross-role 403
    (farmer token, officer token), and role-in-body ignored.
- **E2E token reliability — the long-standing blocker is closed:**
    `field-officer.e2e.cjs` and `field-officer-loans.e2e.cjs` are now fully
    self-provisioning (admin login from env → provision throwaway officers
    → login). They no longer read `scripts/token.tmp` /
    `test/admin_token.tmp`; those files can be ignored/deleted. FO suites
    also gained suspension/reactivation + malformed-token + validation
    assertions. Setup failures exit early with a clear message instead of
    cascading 401s.
- **Cleanup reliability:** all suites write manifests eagerly after every
    created record (an early abort still leaves a complete removal list);
    `cleanup.cjs` now also removes the suite-provisioned officer A (the
    loans manifest previously only recorded officer B — found and fixed via
    a live leak during verification), test-farmer loans in the m2 branch,
    and assignments/visits for every officer id. Full-battery verification:
    `cleanup.cjs` + `cleanup-sweep.cjs` leave the DB at exactly
    3 profiles / 1 loan / 3 transactions.
- **Files created:** `server/src/middleware/security.middleware.ts`.
- **Files modified:** `server/src/app.ts` (helmet/CORS/body-limit/central
  error handler), route files (limiter wiring: farmer auth, admin auth,
  admin field-officers/bank-officers/users), controllers listed above,
  `server/test/{admin,field-officer,field-officer-loans}.e2e.cjs`,
  `server/test/cleanup.cjs`, `server/.env.example` (documents
  `CORS_ORIGINS`, `RATE_LIMIT_*`; local `.env` has raised dev values),
  `README.md`, `AI_README.md`. Dependencies added: `helmet`,
  `express-rate-limit`.
- **Admin reports/settings:** do not exist in the backend and are not
  defined by current requirements — deliberately documented as backlog,
  not invented.
- **Known limitations:** rate-limit state is in-memory (resets on restart;
    a multi-instance deployment would need a shared store); CORS credentials
    remain disabled (token auth, not cookies); no request-id/correlated
    logging yet.
- **Next milestone (recommendation, not started):** apply the Bank Officer
  schema (owner action) → run `bank-officer.e2e.cjs` → wire the Bank
  Officer frontend.

### Milestone 8b — Frontend quality, API contract, testing & codebase cleanup
- **Status:** Complete. Frontend `npm run typecheck` and `npm run lint` are
  **both fully clean** (the two long-standing web CSS-module type errors are
  fixed by `src/css-modules.d.ts`; the one remaining lint warning lives in an
  untracked scratch file outside the repo). Backend untouched except tests:
  `npm run build` passes; all five runnable E2E suites pass live
  (admin 71/71, farmer 72/72, field-officer 50/50,
  field-officer-loans 48/48, security 25/25) with every fixture cleaned via
  `node test/cleanup.cjs` after each run. **Zero schema, DDL, or SQL
  changes. Bank Officer schema remains parked** (untouched; not attempted).
- **API type contract (`src/lib/api-types.ts`, new):** centralized types for
  the backend's real response envelopes and row shapes — `ApiResponse<T>`,
  `ListResult<T>`, the legacy `NotificationsEnvelope`, login/profile/
  transaction/loan/notification/visit/audit/stats rows. Every
  `api.get/post/put/patch/del<any>` call site across the contexts and the
  admin/field-officer screens now uses the typed contracts. The chain is:
  backend contract → typed client → typed context/service → typed screen.
  No speculative types — every field in the file maps to a column a
  controller actually returns.
- **Error model (`src/lib/api.ts`):** `ApiError` extended with 409 (duplicate)
  and 429 (rate limit) handling; 401 on **any** authenticated request now
  clears the token and notifies `AuthContext` (registered handler), so the
  app can never remain falsely authenticated after a token dies mid-session.
  The login screen distinguishes 401 (inline "invalid credentials") from
  everything else (suspended 403 / network / timeout surfaced verbatim
  instead of being misreported as bad credentials).
- **Session lifecycle:** sessions stay in-memory by design (documented).
  Logout clears the token before user state; a 401 anywhere clears both.
  **Account switching is now session-scoped:** every farmer context
  (profile, transactions, loans, notifications) tracks the authenticated
  user id and drops its cached data when it changes (login switch or
  401-driven logout) — User B never inherits User A's rows. Reset uses the
  render-phase derived-state pattern (not effects) so the repo's
  `react-hooks/set-state-in-effect` rule stays clean.
- **Contract fixes found by the audit (all frontend-side):**
  - `field-visits.tsx` read `row.farmer.name_en` but the visits endpoint
    never embeds a farmer summary — names now resolve from the officer's
    own assigned-farmer list (the loans endpoint embeds `farmer`; visits
    does not).
  - `fo-dashboard.tsx` read a nonexistent `scheduledDate` column from
    visit rows (removed); the hero now shows the officer's real
    name/designation from `GET /api/field-officer/profile/me` instead of
    the literal "Field Officer".
  - `fo-dashboard.tsx` overview tiles showed hardcoded mock numbers
    (12/5/3/8) — replaced with real counts derived from the same
    server-scoped lists rendered below.
  - `admin-reports.tsx` showed hardcoded mock stats (510/234/72%/89) —
    now reads the live `/api/admin/dashboard/stats`.
  - `reset-password.tsx` faked a successful reset with no API call — the
    final step now calls the real `POST /api/farmer/auth/reset-password`
    and surfaces failures (the OTP steps remain UI-only until an SMS/email
    provider exists; documented as a limitation, not hidden).
  - No other method/URL/param/body mismatches were found; every integrated
    call was checked against its backend route.
- **State consistency:** farmer mutation forms (add-transaction, apply-loan,
  edit-profile) gained double-submit guards (the optimistic contexts insert
  immediately, so a second tap duplicated rows). Admin user-management
  re-fetches the directory after an **edit** (previously only after create),
  so the list reflects the server's truth. FO verify/visit mutations already
  reload from the server (verified in the M7 wiring).
- **UX states:** farmer screens (transactions, loans, notifications,
  dashboard, profile) previously rendered errors as empty lists and had no
  first-load spinner. Each now renders explicit LOADING / ERROR+RETRY /
  EMPTY states; the dashboard aggregates its four feeds into one error
  banner with a retry; the profile's verified badge now reflects the real
  `is_verified` (previously always "verified"). New translation keys
  `loading` / `retry` added. No visual redesign — same layout language.
- **Security regression suite (`server/test/security.e2e.cjs`, new, 25
  assertions):** missing/empty/garbage/jwt-shaped/wrong-scheme tokens all
  401 (never 500); client-supplied `role` in login AND register bodies is
  ignored (registered account is a farmer, its token gets 403 on admin
  routes); admin lockout attempts (officer creds on admin login, wrong
  passwords) 401; IDOR via `/api/admin/users/:id` with farmer/officer
  tokens 403; suspension enforced on officer AND admin routes with the
  same still-valid token, self-reactivation refused, reactivation restores
  access; error bodies stay minimal (no Supabase/Postgres internals).
  Fixtures cleaned via `security-cleanup.tmp` (merge-safe manifest, new
  handler in `cleanup.cjs`).
- **Officer mutation coverage (`field-officer.e2e.cjs`, +7 assertions):**
  visit cancel transition on a fresh scheduled visit (plus cancel/update on
  nonexistent → 404, invalid UUID → 400, empty update body → 400) close the
  last gaps in the visit lifecycle.
- **Cleanup:** the superseded JS `backend/` skeleton (documented as
  "slated for removal" since M1) is **deleted** — nothing referenced it
  and both docs already said `server/` is the backend. Root
  `.env.example` (new) documents `EXPO_PUBLIC_API_URL` for the frontend;
  secrets audit confirmed `server/.env` ignored, no tokens/credentials
  tracked, `.env.example` files contain placeholders only.
- **Files created:** `src/lib/api-types.ts`, `src/css-modules.d.ts`,
  `.env.example`, `server/test/security.e2e.cjs`.
- **Files modified:** `src/lib/api.ts`, all five contexts, login /
  reset-password / farmer dashboard / profile / edit-profile / add-transaction /
  loans / transactions / notifications / application-detail screens,
  FO dashboard + field-visits + loan-applications, admin users + dashboard +
  reports + audit-logs, `src/constants/translations.ts`,
  `server/test/field-officer.e2e.cjs`, `server/test/cleanup.cjs`,
  `README.md`, `AI_README.md`.
- **Known limitations:** the reset-password OTP steps are UI-only (no
  provider); active-loans (disbursement) UI stays empty by design;
  bank-officer screens remain local/mock pending the parked schema; the
  untracked scratch files (`src/data/`, `src/config/api.ts`,
  `server/scripts/*`, `*.tmp`, notes) predate this milestone and were
  deliberately left untouched.
- **Next milestone (recommendation, not started):** apply the Bank Officer
  schema (owner action) → run `bank-officer.e2e.cjs` → wire the Bank
  Officer frontend.

### Milestone 5 — Bank Officer backend (loan review & decision)
- **Status:** ⚠️ **Implemented but NOT live-verified — blocked solely on schema
  application.** All code is written and `npm run build` (tsc) passes. **Zero Bank
  Officer endpoints have been executed.** As of the finalization session (this
  milestone's verification attempt):
  1. The `admin.sql` bank-officer block has **not** landed on the connected Supabase
     project. Re-probed twice, 45s apart (ruling out PostgREST schema-cache lag; the
     error is Postgres `42703` from the engine itself, identical to a never-existing
     column — verified against a fake column control probe). All 8 columns
     (`loan_applications.bank_officer_id`, `reviewed_at`, `decision_at`,
     `decision_notes`, `approved_amount`; `profiles.bank_name`, `branch_name`,
     `branch_code`) are absent. Two attempts to apply via the SQL editor did not
     take effect (likely wrong project/tab selected); the owner will share env
     details later so the block can be applied programmatically. **Schema application
     is parked as a user action.**
  2. `server/test/bank-officer.e2e.cjs` (89 assertions) has therefore never run —
     but it has been **desk-checked assertion-by-assertion against the implementation
     this session**: admin login token shape, provisioning route guards, profile
     mass-assignment white-list, queue forwarded-only filter + embedded summaries,
     decision enum/status/amount/notes business rules and their exact 400/404/403
     mappings, suspension flow through the status re-check in `bankOfficerOnly`, and
     the cleanup manifest's FK-safe deletion order. All 89 match the code. The count
     below remains checks *written and reviewed*, not passed.
  3. What **was** verified live this session: `npm run build` passes; the Farmer
     regression suite **72/72 passed** against the running server (including the
     dashboard contract checks), with the DB confirmed back to its exact baseline
     afterwards. Field Officer suites remain unrunnable (stale-token dependency,
     documented backlog) and no standalone Admin suite exists.
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
- **Next step:** the owner shares Supabase env details; apply the `admin.sql`
  bank-officer block programmatically (Management API or one-off Postgres connection),
  then run `node test/bank-officer.e2e.cjs` plus the three existing suites as
  regressions, clean up, and only then update this entry to "verified live".

---

## Audit findings (updated)

1. ~~Two backends existed.~~ **Fixed (Milestone 8b)** — the superseded JS `backend/`
   skeleton was removed from the repo; the TypeScript `server/` is the only backend. *(closed)*
2. ~~Response contract mismatch.~~ **Fixed** — every farmer, field-officer and bank-officer
   data endpoint now returns `{ success, message, data }`; the last hold-out
   (`GET /api/farmer/dashboard`) was standardized in the Milestone 4 follow-up. *(closed)*
3. ~~Admin routes not mounted.~~ **Fixed (Milestone 1)** — mounted at `/api/admin`.
4. ~~Missing admin schema / audit module.~~ **Fixed (Milestone 1)** — `admin.sql` + `audit/` added.
5. ~~**CORS is `*`.** Must be scoped before production.~~ **Fixed (Milestone 8)** — allow-list via `CORS_ORIGINS`; blanket wildcard removed and verified live. *(closed)*
6. ~~**Security hardening absent.** No helmet, no rate limiting.~~ **Fixed (Milestone 8)** — helmet headers, tiered per-IP rate limits (auth + admin mutations), 1 MiB body cap, all verified live. *(closed)*
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
   returns `42703` for every new column (all 8, re-probed in the finalization session
   twice, 45s apart, with a fake-column control probe confirming the error comes from
   Postgres itself). Two SQL-editor attempts by the owner did not take effect (most
   likely the editor was open on a different project/tab). `/api/bank-officer/loans`
   degrades to an empty queue and every write path would fail. **This is the single
   blocking item.** `supabase-js` cannot execute DDL; no `exec_sql`-style RPC exists;
   no `SUPABASE_ACCESS_TOKEN`/`DATABASE_URL` is configured. **Owner decision: schema
   work is parked until env details are shared** (then the block can be applied via
   the Management API or a one-off Postgres connection). *(open — user action pending)*
13. **Schema is applied by hand, with no migration history.** `farmer_db.sql` and
   `admin.sql` are idempotent scripts pasted into the SQL editor; there is no
   `supabase/migrations/` directory and nothing records which project is at which
   revision. Milestone 5 is the first time this caused a hard stop. Adopting the
   Supabase CLI with real migrations would remove the manual step. *(open)*
14. ~~Admin login poisoned the shared Supabase client.~~ **Fixed (Milestone 4 follow-up,
   commit `1347f2a`)** — `loginAdmin` called `signInWithPassword` on the shared singleton,
   the same defect class fixed for the farmer login in Milestone 3. Until the fix, any
   admin login left every later service query running under the admin's JWT, failing RLS
   until a server restart (symptom: farmer registration returning
   `new row violates row-level security policy for table "profiles"`). Both login paths
   now use throwaway clients; a repo-wide grep confirms no singleton `signInWithPassword`
   remains. Caught only because the farmer E2E suite stopped reading stale token files
   and started exercising login for real.
15. ~~`safeCount` never executed its queries.~~ **Fixed (Milestone 6, commit `d180d56`)** —
   `safeCount(query)` did `await query` on an un-invoked thunk, so the destructured
   `count`/`error` were both `undefined` and **every dashboard statistic silently
   returned 0 from the day the dashboard was written (Milestone 1)**. The "verified
   live" notes for `/stats` had only ever checked the 200 status, never the numbers —
   a documentation-accuracy failure as much as a code one. The admin E2E now asserts
   real counts against fixtures so a silent zero fails loudly. Lesson recorded:
   HTTP-status-only verification is not verification.
16. ~~Suspension had no enforcement.~~ **Fixed (Milestone 6)** — admin status endpoints
   existed but `farmerOnly`/`fieldOfficerOnly` never read `profiles.status`, so a
   suspended officer kept full API access until token expiry. Both guards now re-read
   the status per request, matching `bankOfficerOnly`; verified live both directions.

---

## Cross-cutting backlog

- **Bank Officer frontend wiring** (Milestone 7 wired farmer, field-officer, and
  admin; bank-officer screens intentionally remain local/mock until the parked
  schema lands and the module is live-verified).
- **Apply the `admin.sql` bank-officer block to the live project and run
  `node test/bank-officer.e2e.cjs` + the three existing suites** (blocking; see audit
  finding 12 — parked on the owner sharing Supabase env details; the E2E has been
  desk-checked against the implementation in the meantime).
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
- ~~Backport the self-provisioning token approach to the older suites so they stop
  depending on stale `*.tmp` bearer tokens.~~ **Done for all runnable suites
  (Milestone 8)** — farmer, admin, field-officer and field-officer-loans are all
  self-provisioning; the `scripts/token.tmp` / `test/admin_token.tmp` dependency is gone.
- ~~CORS is `*`. Must be scoped before production.~~ **Fixed (Milestone 8)** —
  allow-list via `CORS_ORIGINS`; blanket wildcard removed.
- ~~Security hardening absent. No helmet, no rate limiting.~~ **Fixed (Milestone
  8)** — helmet headers, tiered per-IP rate limits (auth + admin mutations),
  1 MiB body cap. In-memory limiter state noted as a limitation for
  multi-instance deployments.
- ~~Remove the superseded JS `backend/` skeleton.~~ **Done (Milestone 8b)** —
  deleted; nothing referenced it.
- ~~Standardize `{ success, message, data }` across farmer handlers.~~ Long-closed
  (Milestone 4 follow-up); the one deliberate legacy hold-out is
  `GET /api/farmer/notifications` returning `{ notifications, success }` — accepted
  and handled by the frontend's `NotificationsEnvelope` type.

---

## Conventions for future sessions

- Branch: `feature/akash` only. Never push to `main`.
- One logical feature per commit; commit + push after each milestone.
- Update **both** `README.md` and `AI_README.md` every milestone.
- Never commit `.env` or hardcode secrets. Keep `.env.example` current.
- Enforce roles server-side; never trust a client-supplied role.
- Do not document anything as implemented unless it actually works.
