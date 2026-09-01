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

> **Note:** `backend/` (JavaScript) is a superseded early skeleton. The active backend is
> the TypeScript `server/`. `backend/` is slated for removal.

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
backend via `src/config/api.ts` (`http://localhost:3000`, or `http://10.0.2.2:3000` on the
Android emulator). Override with `EXPO_PUBLIC_API_URL` in a root `.env`.

> Frontend↔backend integration is a later, deliberate phase; the committed frontend currently
> runs on local/mock state.

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
- `dashboard` — profile + recent transactions/loans + counts.
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

> ⚠️ **Status: implemented but not live-verified.** These endpoints require the
> bank-officer columns from [`server/admin.sql`](server/admin.sql), which are **not yet
> applied** to the development Supabase project. Apply them (see
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

## Authentication & roles

- Auth is handled by **Supabase Auth**. The app sends the Supabase access token as
  `Authorization: Bearer <token>`; the backend verifies it with `supabase.auth.getUser()`.
- **Roles are never trusted from the client.** The `authenticate` middleware resolves the
  user, then role guards (e.g. `farmerOnly`) read the role from the `profiles` table server-side.
- Roles: `farmer`, `field_officer`, `bank_officer`, `admin`.

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
  `npm run build`, then `node test/farmer.e2e.cjs` (profile/credit/transactions/loans),
  `node test/field-officer.e2e.cjs` (profile/farmers/verification/visits), and
  `node test/field-officer-loans.e2e.cjs` (loan workflow) against a running server.
  The harnesses need fresh local bearer tokens in `server/scripts/token.tmp` (field
  officer) and `server/test/admin_token.tmp` (admin); these files are test artifacts and
  must not be committed. After a run, `node test/cleanup.cjs` and
  `node test/cleanup-sweep.cjs` remove the test-created records.
- `node test/bank-officer.e2e.cjs` (bank officer profile + loan review/decision) is
  **self-provisioning**: it needs no token files at all. It logs in through the public
  admin endpoint using `ADMIN_EMAIL`/`ADMIN_PASSWORD` from `server/.env`, then creates its
  own field officer, bank officers and farmer, and drives the whole pipeline. Requires the
  bank-officer columns to be applied first (see [Supabase setup](#supabase-setup)).
  **This suite has not yet been executed** — the schema is still outstanding.
- The live E2E suites cover successful requests, validation failures, duplicate
  registration, assignment/ownership checks (including cross-officer IDOR attempts),
  invalid state transitions, unauthenticated access, and wrong-role access.
  Test-created records should be removed after a run against a shared Supabase project.
- Planned: automated unit/integration coverage for the Farmer, Bank Officer, and Admin modules.

---

## Development notes

- Work happens on `feature/akash`. Do not push to `main`.
- Keep business logic in services, not route definitions.
- Follow the existing `modules/<role>/<feature>/{controller,routes,service}` structure.
- Never commit secrets. `.env` files are git-ignored; keep `.env.example` current.
