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
> The **admin** module already returns `{ success, message, data }`. The **farmer** module
> still returns `{ message, ... }`. Standardizing farmer handlers is a cross-cutting task.

**Live database note:** the connected Supabase project already has the admin/officer schema
applied (audit_logs, admin/field-officer columns, etc. exist live, with prior data). `farmer_db.sql`
and `admin.sql` reproduce that schema for a fresh project.

---

## Role implementation status

| Role          | Status                | Notes                                                                 |
| ------------- | --------------------- | --------------------------------------------------------------------- |
| Admin         | Implemented (core)    | auth (login/me/change-password/seed), dashboard (stats/trends/overview), audit trail, and field-officer **read** management are **mounted at `/api/admin` and verified live**. Field-officer **create/update/status/reset** are wired + schema-backed but not yet live-mutation-tested. Generic user management, reports, and settings still planned. |
| Farmer        | Partially implemented | auth, profile, dashboard, loans, transactions, notifications modules exist; server boots and login round-trips to Supabase. Full per-endpoint DB behavior not re-verified this cycle. |
| Field Officer | Implemented (core)    | Profile, assigned-farmer management/registration, verification history/update, and field visits are mounted at `/api/field-officer` and verified live. Loan-application officer workflow and frontend API wiring remain open. |
| Bank Officer  | Planned               | Nothing yet (no middleware, routes, or services).                     |

---

## Backend baseline

**Foundation (server/src):**

- `app.ts` — `cors` (origin `*`), `express.json()`, health `GET /` →
  `{ message: 'Sofol api is running' }`, mounts `/api/farmer`, `/api/admin`, and
  `/api/field-officer`, 404 handler,
  generic 500 error handler.
- `server.ts` — `app.listen(process.env.PORT || 3000)`.
- `config/supabase.ts` — `supabase` + `supabaseAdmin` service-role clients; **throws at startup**
  if `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are missing. `persistSession: false`.
- `middleware/auth.middleware.ts` — `authenticateUser`: Bearer → `supabase.auth.getUser` →
  `req.user`; `401` on missing/invalid.
- `middleware/role.middleware.ts` (`farmerOnly`), `admin.middleware.ts` (`adminOnly`),
  `fieldOfficer.middleware.ts` — role guards; read role from `profiles`, self-heal, fall back
  to auth metadata, `403` otherwise. `adminOnly` also short-circuits for the env `ADMIN_EMAIL`.

**Farmer module** (`modules/farmer/*`): mounts `/auth`, `/profile`, `/dashboard`, `/loans`,
`/transactions`, `/notifications`.

**Admin module** (`modules/admin/*`, mounted at `/api/admin`):
- `admin.routes.ts` — barrel: `/auth`, `/dashboard`, `/field-officers`, `/audit`.
- `auth/*` — `POST /login` (public, self-seeds admin), `POST /seed` (public, idempotent),
  `GET /me`, `POST /change-password` (guarded). Admin creds from `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- `dashboard/*` — `GET /stats`, `/registration-trend`, `/loan-analytics`, `/recent-activity`,
  `/overview` (guarded). Counts degrade to 0 on missing tables via `safeCount`.
- `fieldOfficers/*` — `GET /` (list, paginated/search/filter), `GET /:id`, `POST /` (create),
  `PUT /:id`, `PATCH /:id/status`, `POST /:id/reset-password` (guarded). Creates a
  `field_officer` auth user + profile; edits via a field white-list.
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
- `validation.ts` — shared UUID, date, pagination, bounded text, array, and boolean validation
  used by the Field Officer handlers/services.

**Schema:** `farmer_db.sql` (profiles, transactions, loan_applications, loan_timeline,
notifications, storage bucket) + `admin.sql` (admin/field-officer columns on profiles;
audit_logs; field_officer_assignments; field_visits; farmer_verifications; loan review columns).

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

---

## Audit findings (updated)

1. **Two backends existed.** TS `server/` adopted; JS `backend/` superseded — recommend removal. *(open)*
2. **Response contract mismatch.** Farmer returns `{ message }`; admin returns `{ success, message, data }`. *(open)*
3. ~~Admin routes not mounted.~~ **Fixed (Milestone 1)** — mounted at `/api/admin`.
4. ~~Missing admin schema / audit module.~~ **Fixed (Milestone 1)** — `admin.sql` + `audit/` added.
5. **CORS is `*`.** Must be scoped before production. *(open)*
6. **Security hardening absent.** No helmet, no rate limiting. *(open)*
7. **`tsconfig` `types: []`.** `tsc --noEmit` can error on Node globals; runtime uses `--transpile-only`. *(open)*
8. **Unused deps.** `jsonwebtoken`, `bcryptjs` unused (auth is Supabase-based). *(open)*
9. **Field Officer loan workflow.** Officer-facing loan application review/forwarding is not yet
   implemented; the current officer loan screen remains local/mock. *(open)*

---

## Cross-cutting backlog

- Standardize `{ success, message, data }` across farmer handlers.
- Add central request validation (Zod available).
- Add security middleware: `helmet`, rate limiting, scoped CORS.
- Admin: generic user management (all roles), bank-officer account creation, reports, settings.
- Live-test the remaining Admin field-officer create/update/status/reset paths (with cleanup).
- Standardize/extend automated tests across Farmer, Bank Officer, and Admin APIs.
- Remove the superseded JS `backend/` skeleton.

---

## Conventions for future sessions

- Branch: `feature/akash` only. Never push to `main`.
- One logical feature per commit; commit + push after each milestone.
- Update **both** `README.md` and `AI_README.md` every milestone.
- Never commit `.env` or hardcode secrets. Keep `.env.example` current.
- Enforce roles server-side; never trust a client-supplied role.
- Do not document anything as implemented unless it actually works.
