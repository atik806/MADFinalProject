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
| Field Officer | Planned               | Role middleware exists; admin can (once tested) create officer accounts. No officer-facing routes yet. |
| Bank Officer  | Planned               | Nothing yet (no middleware, routes, or services).                     |

---

## Backend baseline

**Foundation (server/src):**

- `app.ts` — `cors` (origin `*`), `express.json()`, health `GET /` →
  `{ message: 'Sofol api is running' }`, mounts `/api/farmer` and `/api/admin`, 404 handler,
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

---

## Cross-cutting backlog

- Standardize `{ success, message, data }` across farmer handlers.
- Add central request validation (Zod available).
- Add security middleware: `helmet`, rate limiting, scoped CORS.
- Admin: generic user management (all roles), bank-officer account creation, reports, settings.
- Live-test the field-officer create/update/status/reset paths (with cleanup).
- Automated tests (auth, per-role authorization, error codes).
- Remove the superseded JS `backend/` skeleton.

---

## Conventions for future sessions

- Branch: `feature/akash` only. Never push to `main`.
- One logical feature per commit; commit + push after each milestone.
- Update **both** `README.md` and `AI_README.md` every milestone.
- Never commit `.env` or hardcode secrets. Keep `.env.example` current.
- Enforce roles server-side; never trust a client-supplied role.
- Do not document anything as implemented unless it actually works.
