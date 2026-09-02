# SOFOL — Farmer Credit Profile Platform

SOFOL is a mobile platform that builds **credit profiles for farmers** so banks can make
informed lending decisions. It serves four roles — **Farmer**, **Field Officer**,
**Bank Officer**, and **Admin** — from a single Expo app backed by an Express + Supabase API.

> **Status:** The Expo frontend is built. The backend is under active development on the
> `feature/akash` branch. Farmer and Field Officer APIs are implemented and verified
> against a live database; the Bank Officer API is implemented but **awaiting a schema
> migration and its first live run**. See [AI_README.md](AI_README.md) for the detailed,
> honest per-feature implementation status.

---

## Architecture

```
┌─────────────────────────┐        HTTPS / JSON        ┌──────────────────────────┐
│  Expo app (src/)        │  ───────────────────────▶  │  Express API (server/)   │
│  React Native + Router  │   Authorization: Bearer    │  TypeScript, modular     │
│  React Context state    │  ◀───────────────────────  │  business logic          │
└─────────────────────────┘   { success, message,      └───────────┬──────────────┘
                                 data }                             │ service-role key
                                                                    ▼
                                                        ┌──────────────────────────┐
                                                        │  Supabase                │
                                                        │  Auth + Postgres + Storage│
                                                        └──────────────────────────┘
```

- **Frontend** — Expo (SDK 56) / React Native / TypeScript, file-based routing via `expo-router`,
  state in React Context. Located at the repo root under `src/`.
- **Backend** — Express 5 + TypeScript in `server/`. Holds all business logic and is the only
  tier that talks to Supabase, using the **service-role key** (never shipped to the app).
- **Supabase** — authentication (Supabase Auth), Postgres database, and file storage.

Request flow: **Route → Middleware (authenticate → requireRole) → Controller → Service → Supabase.**

---

## Repository layout

```
.
├── src/                 # Expo frontend (screens, contexts, components)
├── server/              # Express + Supabase backend  ← active development
│   ├── src/
│   │   ├── app.ts           # Express app: CORS, JSON, routes, 404, error handler
│   │   ├── server.ts        # HTTP listener
│   │   ├── config/          # supabase.ts (service-role client)
│   │   ├── middleware/      # auth, role, admin, field-officer, bank-officer guards
│   │   └── modules/         # <role>/<feature>/{controller,routes,service}
│   ├── farmer_db.sql        # Supabase base schema (run in the SQL editor)
│   ├── admin.sql            # admin/officer/audit/loan-review schema (run second)
│   └── .env.example         # copy to server/.env
├── README.md            # this file
└── AI_README.md         # detailed technical status / project memory
```

> **Note:** The early JavaScript `backend/` skeleton was removed in Milestone 8 —
> the active backend is the TypeScript `server/`.

---

## Prerequisites

- Node.js 18+ and npm
- A Supabase project (URL + **service-role** key)
- Expo tooling (`npx expo`) for the frontend

---

## Backend — setup & run

```bash
cd server
npm install
cp .env.example .env      # then fill in your Supabase keys (see below)
npm run dev               # ts-node-dev, hot reload on http://localhost:3000
```

Verify it is up:

```bash
curl http://localhost:3000/
```

Expected: `{"message":"Sofol api is running"}`

Build / run compiled output:

```bash
npm run build   # tsc → dist/
npm start       # node dist/server.js
```

### Environment variables (`server/.env`)

| Variable                    | Required | Purpose                                                         |
| --------------------------- | -------- | --------------------------------------------------------------- |
| `SUPABASE_URL`              | yes      | Supabase project URL                                            |
| `SUPABASE_SERVICE_ROLE_KEY` | yes      | **Secret.** Server-only key; bypasses RLS. Never expose to app. |
| `SUPABASE_ANON_KEY`         | no       | Public anon key (reserved for future least-privilege use)       |
| `PORT`                      | no       | HTTP port (default `3000`)                                      |
| `ADMIN_EMAIL`               | no       | Seed admin email (default `admin@gmail.com`)                    |
| `ADMIN_PASSWORD`            | no       | Seed admin password (default `123456` — change it)              |

`server/.env` is git-ignored. Only `server/.env.example` is committed.

### Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor → New query**, run [`server/farmer_db.sql`](server/farmer_db.sql), then run [`server/admin.sql`](server/admin.sql) (admin/officer/audit schema).
3. Copy your **Project URL** and **service-role key** (Project Settings → API) into `server/.env`.

Both files are **idempotent** — re-run [`server/admin.sql`](server/admin.sql) after pulling
changes that add columns. It only ever adds what is missing and never drops data.

> **Existing projects:** the bank-officer columns added for the Bank Officer API
> (`profiles.bank_name/branch_name/branch_code` and
> `loan_applications.bank_officer_id/reviewed_at/decision_at/decision_notes/approved_amount`)
> are **not** applied automatically. `supabase-js` cannot execute DDL, so re-run
> `server/admin.sql` in the SQL editor. Verify with:
>
> ```sql
> select column_name from information_schema.columns
> where table_schema = 'public' and table_name = 'loan_applications'
>   and column_name in ('bank_officer_id','reviewed_at','decision_at','decision_notes','approved_amount');
> ```
>
> Five rows means the API is ready; zero means `/api/bank-officer` will return an empty
> queue and fail on every write.

---

## Frontend — setup & run

```bash
npm install
npx expo start
```

Open on an Android emulator, iOS simulator, Expo Go, or the web. The app talks to the
backend via `src/lib/api.ts` (`http://localhost:3000`, or `http://10.0.2.2:3000` on the
Android emulator). Override with `EXPO_PUBLIC_API_URL` in a root `.env` (see
[`.env.example`](.env.example)).

> **Milestone 8 — Frontend quality & API contract (current state):** all API
> call sites are typed against the centralized backend contracts in
> `src/lib/api-types.ts`; the API client normalizes every failure mode
> (400/401/403/404/409/429/5xx/network) into `ApiError`, and a 401 on any
> authenticated request clears the session so the app cannot stay falsely
> authenticated. Farmer screens (transactions, loans, notifications,
> dashboard, profile) render explicit loading / error + retry / empty states;
> mutation forms have double-submit guards. The Field Officer dashboard shows
> real server-scoped counts and the officer's own profile; visit cards resolve
> farmer names from the officer's assigned-farmer list. Admin reports read
> live dashboard statistics. Password reset calls the real
> `/api/farmer/auth/reset-password` endpoint (the OTP steps remain UI-only
> until an SMS/email provider exists). Bank-officer screens remain
> local/mock — that role's backend schema is still parked.

---

## API overview

Base URL: `http://localhost:3000`

| Method | Path                        | Auth   | Notes                    |
| ------ | --------------------------- | ------ | ------------------------ |
| GET    | `/`                         | none   | Health check             |
| *      | `/api/farmer/auth`          | mixed  | Register / login / reset |
| GET/PUT | `/api/farmer/me`           | farmer | Own profile (`/profile` alias) |
| GET    | `/api/farmer/credit`        | farmer | Read-only credit profile |
| *      | `/api/farmer/dashboard`     | farmer | Dashboard aggregates     |
| *      | `/api/farmer/transactions`  | farmer | Income / expense records |
| *      | `/api/farmer/loans`         | farmer | Loan applications        |
| *      | `/api/farmer/notifications` | farmer | Notifications            |
| POST   | `/api/admin/auth/login`     | none   | Admin login (self-seeds) |
| *      | `/api/admin/dashboard`      | admin  | Stats, trends, overview  |
| *      | `/api/admin/field-officers` | admin  | Field-officer management |
| *      | `/api/admin/bank-officers`  | admin  | Bank-officer provisioning |
| *      | `/api/admin/users`          | admin  | All-role user directory |
| *      | `/api/admin/farmers`        | admin  | Farmer directory (read-only) |
| GET    | `/api/admin/audit`          | admin  | Audit trail              |

Field Officer endpoints are available for the current profile, farmer, verification, visit,
and loan-application workflows. Bank Officer endpoints (profile + loan review/decision) are
implemented but **not yet verified against a live database** — see
[AI_README.md](AI_README.md) for the detailed live status.

### Farmer API

All farmer data endpoints require a Bearer token with the `farmer` role. Every query is
scoped to the authenticated farmer: farmers can only read and write their own profile,
transactions, loans, notifications, and credit data.

- `auth/*` — register, login (email/phone/NID), demo password reset, document upload.
- `GET/PUT /me` (alias `/profile`) — own profile. PUT filters privileged columns
  (`is_verified`, `credit_score`, `farmer_id`, `role`, `status`, `member_since`) so they can
  never be set through the farmer API.
- `GET /credit` — read-only credit profile: verified information (officer verification
  history, `is_verified`, `credit_score`), declared farmer-provided financial data, and
  system-derived loan aggregates. No write path exists.
- `dashboard` — profile + recent transactions/loans + counts, on the shared
  `{ success, message, data }` contract like every other farmer endpoint.
- `loans` — list/get own applications (with timeline) and apply for new ones. New
  applications enter the shared pipeline as `pending`; status decisions, officer
  verification, and forwarding are not writable here.
- `transactions` — full income/expense CRUD. Amounts follow the frontend sign convention
  (income positive, expense negative); `farmer_id` is always derived from the token, never
  the client. Updates are limited to whitelisted columns.
- `notifications` — list/mark-read/delete own notifications.

### Field Officer API

All endpoints below require `Authorization: Bearer <supabase-access-token>` and a server-side
`field_officer` profile. Farmer reads, verification writes, and visits are scoped to the
officer's active assignments/owned visits.

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET/PUT | `/api/field-officer/profile/me` | Read/update own officer profile |
| GET | `/api/field-officer/farmers` | List assigned farmers; supports `search`, `status`, `page`, `pageSize` |
| GET/PUT | `/api/field-officer/farmers/:id` | Read/update an assigned farmer |
| POST | `/api/field-officer/farmers` | Register a new farmer account and assign it to the officer |
| GET | `/api/field-officer/verification` | List this officer's verification history |
| POST | `/api/field-officer/verification/farmers/:id` | Submit verification for an assigned farmer |
| PUT | `/api/field-officer/verification/:id` | Update an officer-owned verification |
| GET/POST | `/api/field-officer/visits` | List or schedule visits for assigned farmers |
| GET/PUT | `/api/field-officer/visits/:id` | Read/update an owned visit |
| POST | `/api/field-officer/visits/:id/complete` | Mark an owned visit completed |
| POST | `/api/field-officer/visits/:id/cancel` | Cancel an owned visit |
| GET/POST | `/api/field-officer/loans` | List/create loan applications for assigned farmers (supports `status`, `verificationStatus`, `farmerId`, `page`, `pageSize`) |
| GET/PUT | `/api/field-officer/loans/:id` | Read an authorized application / edit a draft |
| POST | `/api/field-officer/loans/:id/submit` | Submit a draft (`draft` → `pending`) |
| POST | `/api/field-officer/loans/:id/verify` | Record the officer verification verdict (`verified`/`rejected` + notes) |
| POST | `/api/field-officer/loans/:id/forward` | Forward a field-verified application to the bank |

Loan workflow notes: officers create applications as **drafts** for actively assigned
farmers only, edit them while still drafts, then submit (`draft` → `pending`). After
submission the officer records a verification verdict and, when verified, forwards the
application to the bank (`forwarded_at`/`forwarded_by`). Bank-officer decisions
(`under_review`/`approved`/`rejected`) are not writable through these endpoints.

### Bank Officer API

> ⚠️ **Status: implemented but not live-verified (blocked on schema).** These endpoints
> require the bank-officer columns from [`server/admin.sql`](server/admin.sql), which are
> **not yet applied** to the development Supabase project (all 8 columns re-probed and
> still returning `42703`). The E2E suite is written and desk-checked against the
> implementation, but has not been executed. Apply the columns (see
> [Supabase setup](#supabase-setup)) before using this section.

All endpoints require `Authorization: Bearer <supabase-access-token>` and a server-side
**active** `bank_officer` profile. Bank officer accounts are created by an admin via
`POST /api/admin/bank-officers`; there is no self-registration.

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET/PUT | `/api/bank-officer/profile/me` | Read/update own bank-officer profile |
| GET | `/api/bank-officer/loans` | Review queue — **forwarded applications only**; supports `status`, `verificationStatus`, `farmerId`, `page`, `pageSize` |
| GET | `/api/bank-officer/loans/:id` | Application detail with timeline, farmer, and field-officer summaries |
| POST | `/api/bank-officer/loans/:id/review` | Move a forwarded application `pending` → `under_review` |
| POST | `/api/bank-officer/loans/:id/decision` | Record the final verdict (`approved` / `rejected`) |

Review workflow notes:

- **The bank only ever sees applications a field officer has forwarded.** A draft, or a
  submitted-but-not-forwarded application, returns `404` — identical to a nonexistent id, so
  the upstream pipeline cannot be enumerated.
- All bank officers share one queue. There is no branch assignment table, so who *acted* is
  recorded in `bank_officer_id` rather than restricting who *can* act.
- A decision requires `verification_status = 'verified'`. An already-decided application
  cannot be re-decided (`400`), so an approval cannot later be flipped to a rejection.
- A **rejection must include `notes`** and must not include `approvedAmount`.
- `approvedAmount` defaults to the officer's `recommended_amount` (else the requested
  `amount`) and **can never exceed the requested amount** — a bank may sanction less, never
  more.
- Disbursement (`approved` → `active`) and repayment (`→ completed`) are **not implemented**;
  no endpoint here can set those statuses.
- The profile update white-list excludes `bank_name` / `branch_name` / `branch_code`: the
  posting is set by the admin, so an officer cannot move themselves to another branch.

---

### Admin API

All endpoints require `Authorization: Bearer <supabase-access-token>` and a server-resolved
`admin` profile (the `ADMIN_EMAIL` account short-circuits the role check so the primary
admin keeps working while the schema is applied). Admin actions are audit-logged.

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/admin/users` | Directory across **all roles**; supports `role`, `status`, `search`, `page`, `pageSize` |
| GET | `/api/admin/users/:id` | Full profile of any account |
| PATCH | `/api/admin/users/:id/status` | `active` / `inactive` / `suspended` — refused for admin rows |
| GET | `/api/admin/farmers` | Farmer directory (read-only); `search`, `district`, `verification`, `status` filters |
| GET | `/api/admin/farmers/:id` | Farmer profile + officer verification history |
| GET/POST | `/api/admin/field-officers` | List / create field officers |
| GET/PUT/PATCH | `/api/admin/field-officers/:id…` | Detail, edit, status, reset-password |
| GET/POST | `/api/admin/bank-officers` | List / create bank officers |
| GET/PATCH | `/api/admin/bank-officers/:id…` | Detail, status |
| GET | `/api/admin/dashboard/stats` | Platform statistics (incl. bank-officer counts) |
| GET | `/api/admin/dashboard/overview` | Stats + trends + analytics + recent activity |
| GET | `/api/admin/audit` | Paginated audit trail |

Notes:

- **Suspension has immediate effect:** the role guards (`farmerOnly`,
  `fieldOfficerOnly`, `bankOfficerOnly`) re-read `profiles.status` on every
  request, so a deactivated account loses access while its token is still
  valid. `pending` farmers are unaffected — that is the registration default.
- **Admin accounts cannot be suspended** through the API: the primary admin is
  env-configured (`ADMIN_EMAIL`/`ADMIN_PASSWORD`) and has no lockout recovery.
- The farmer directory is **read-only**: verification is a field-officer
  workflow and account status lives in the unified users endpoint.
- Directory listings exclude NID; bank-officer posting details (bank/branch)
  appear in per-record detail views.

## Authentication & roles

- Auth is handled by **Supabase Auth**. The app sends the Supabase access token as
  `Authorization: Bearer <token>`; the backend verifies it with `supabase.auth.getUser()`.
- **Roles are never trusted from the client.** The `authenticate` middleware resolves the
  user, then role guards (e.g. `farmerOnly`) read the role from the `profiles` table server-side.
- Roles: `farmer`, `field_officer`, `bank_officer`, `admin`.
- The frontend maps the server-resolved profile role to its routing union once, at login
  (`BACKEND_ROLE_MAP` in `src/contexts/AuthContext.tsx`); a client-supplied role field
  never influences routing or access.
- Sessions are in-memory by design (no storage dependency): the token lives in module
  state inside `src/lib/api.ts` and is cleared on logout, on login of a different
  account, and on any 401 response (stale/expired session). Closing the app ends the
  session — documented behavior for this milestone.
- Account switching is session-scoped: the farmer contexts (profile, transactions,
  loans, notifications) drop their cached data when the authenticated user changes, so
  User B never inherits User A's state.

### Frontend error model

Every API failure surfaces as an `ApiError` (`src/lib/api.ts`) with an optional HTTP
`status` and user-safe message:

| Failure | Behavior |
| ------- | -------- |
| 400 validation | Backend's field-validation message shown on the form |
| 401 unauthorized | Token + session cleared; "session expired" message |
| 403 forbidden / suspended | Backend's "not active"/"not an admin" message; request never faked as success |
| 404 not found | "requested item was not found" |
| 409 duplicate | Backend's duplicate-registration message |
| 429 rate limited | "Too many requests" with retry guidance |
| 5xx / network / timeout | Generic server/network message — Supabase, SQL, and stack traces never leak |

---

## Security middleware (Milestone 8)

- **CORS** — allow-list driven via `CORS_ORIGINS` (comma-separated). Empty falls back to
  Expo dev origins (`localhost:8081/19006`, `127.0.0.1:8081`, `exp://localhost:19000`);
  production must set its real client origins. The previous blanket `origin: '*'` is gone.
- **Helmet** — security headers on every response (CSP, HSTS, nosniff, frame protection;
  cross-origin isolation headers disabled so the Expo web client on another port works).
- **Rate limiting** (per-IP, 15-minute window, `express-rate-limit`):
  - `RATE_LIMIT_AUTH_MAX` (default 100) on farmer `register`/`login`/`reset-password`
    and admin `login`/`seed`.
  - `RATE_LIMIT_ADMIN_MUTATION_MAX` (default 60) on admin officer provisioning, updates,
    status changes, password resets, and user status changes.
  - 429 responses carry a generic message + standard `Retry-After` header — no internals.
- **Body limits** — `express.json` capped at 1 MiB (uploads already capped at 5 MiB by multer);
  oversized bodies get 413, malformed JSON gets a safe 400.
- **Error hygiene** — every controller passes errors through `safeErrorMessage` (module
  validation messages pass; raw Supabase/Postgres text is masked). The global handler never
  leaks stack traces. In-memory limiter state means limits reset on server restart.
- Defaults are production-safe; raise them in local `.env` when running the full E2E
  battery back-to-back (see `server/.env.example`).

---

## Database overview

Postgres (Supabase). Core tables in [`server/farmer_db.sql`](server/farmer_db.sql):

- `profiles` — one row per user (FK to `auth.users`); role, status, farmer data, credit score.
- `transactions` — farmer income / expense records.
- `loan_applications` + `loan_timeline` — loan requests and their status steps.
- `notifications` — per-user notifications.
- Storage bucket `farmer-documents` for uploaded photos / documents.

[`server/admin.sql`](server/admin.sql) adds the admin/officer surface: `audit_logs`,
`field_officer_assignments`, `field_visits`, `farmer_verifications`, admin/field-officer/
bank-officer columns on `profiles`, the loan review columns on `loan_applications`
(`verification_status`, `verified_at`, `verification_notes`, `field_officer_id`,
`forwarded_at`/`forwarded_by`, `recommended_amount`), and the bank decision columns
(`bank_officer_id`, `reviewed_at`, `decision_at`, `decision_notes`, `approved_amount`).

Loan application status lifecycle across all three roles:

```
        field officer                          bank officer
draft ──────submit──────> pending ──review──> under_review ──┬──> approved
  ▲                          │                               └──> rejected
  └── officer-created        └── verify (verification_status)
      draft only                 then forward (forwarded_at) ── hands over to the bank
```

The bank only receives applications with `forwarded_at` set. `active` and `completed` exist
in the lifecycle for disbursement and repayment, which are **not yet implemented**.

---

## Testing

- Current: TypeScript build plus live E2E coverage. From `server/`, run
  `npm run build`, then `node test/farmer.e2e.cjs` (profile/credit/transactions/loans/
  dashboard), `node test/field-officer.e2e.cjs` (profile/farmers/verification/visits),
  `node test/field-officer-loans.e2e.cjs` (loan workflow), `node test/admin.e2e.cjs`
  (user directory/status enforcement/officer management/dashboard/audit), and
  `node test/security.e2e.cjs` (cross-cutting auth guards) against a running server.
- Frontend: `npm run typecheck` and `npm run lint` from the repo root (both clean).
- **All five runnable suites are self-provisioning**: each one logs in the
  admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `server/.env`, provisions its own throwaway
  officers/farmers through the public and admin APIs, and cleans up every fixture via
  `node test/cleanup.cjs`. No manual token files are needed anymore — the old
  `scripts/token.tmp` / `test/admin_token.tmp` stale-token dependency is gone.
- The suites share per-IP rate limits with real clients: when running the full battery
  back-to-back, raise `RATE_LIMIT_AUTH_MAX` / `RATE_LIMIT_ADMIN_MUTATION_MAX` in local
  `.env` (see [Security middleware](#security-middleware-milestone-8)).
- `node test/bank-officer.e2e.cjs` (bank officer profile + loan review/decision) is
  also self-provisioning but requires the bank-officer columns to be applied first
  (see [Supabase setup](#supabase-setup)). **This suite has not yet been executed** —
  the schema is still outstanding; it has been desk-checked against the implementation
  and is ready to run the moment the columns exist.
- The admin suite's cleanup manifest **merges across runs** so consecutive runs cannot
  orphan fixtures; the security suite's manifest does the same.
- After any run, `node test/cleanup.cjs` and `node test/cleanup-sweep.cjs` remove the
  test-created records (including any officer the farmer/admin/security suites provisioned).
- The live E2E suites cover successful requests, validation failures, duplicate
  registration, assignment/ownership checks (including cross-officer IDOR attempts),
  invalid state transitions, unauthenticated access, wrong-role access, malformed and
  missing tokens (of several shapes — all 401, never a 500 or leak), client-supplied
  role fields in login/register bodies (ignored), admin lockout attempts (officer
  credentials against the admin endpoint, wrong passwords), suspension enforcement on
  officer AND admin routes with reactivation recovery, visit cancel/update/complete
  transitions, and minimal error bodies (no Supabase/Postgres internals).
  Test-created records should be removed after a run against a shared Supabase project.
- Planned: automated unit/integration coverage for the Farmer, Bank Officer, and Admin modules.

---

## Development notes

- Work happens on `feature/akash`. Do not push to `main`.
- Keep business logic in services, not route definitions.
- Follow the existing `modules/<role>/<feature>/{controller,routes,service}` structure.
- Never commit secrets. `.env` files are git-ignored; keep `.env.example` current.
