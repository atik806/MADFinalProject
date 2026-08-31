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

**Response contract (target):** `{ success, message, data }`.
> Current reality: the existing farmer/admin handlers largely return `{ message, ... }`.
> Standardizing every handler on `{ success, message, data }` is tracked as a cross-cutting task.

---

## Role implementation status

| Role          | Status              | Notes                                                                 |
| ------------- | ------------------- | --------------------------------------------------------------------- |
| Farmer        | Partially implemented | auth, profile, dashboard, loans, transactions, notifications modules exist and the server boots; end-to-end DB behavior not yet re-verified against live Supabase this session. |
| Admin         | Partially implemented | auth, dashboard, field-officer management modules exist **but routes are NOT mounted** in `app.ts`; `admin.sql` schema is missing. |
| Field Officer | Planned             | Only role middleware exists (`fieldOfficer.middleware.ts`). No routes/controllers/services. |
| Bank Officer  | Planned             | Nothing yet (no middleware, routes, or services).                     |

---

## Backend baseline (as of Milestone 0)

**Files (server/):**

- `src/app.ts` — Express app. `cors` (origin `*`), `express.json()`, health `GET /` →
  `{ message: 'Sofol api is running' }`, mounts **only** `/api/farmer`, 404 handler
  (`{ message: 'Api endpoint not found!' }`), generic 500 error handler.
- `src/server.ts` — `app.listen(process.env.PORT || 3000)`.
- `src/config/supabase.ts` — builds `supabase` and `supabaseAdmin` service-role clients;
  **throws at startup** if `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are missing.
  `auth: { persistSession: false, autoRefreshToken: false }`.
- `src/middleware/auth.middleware.ts` — `authenticateUser`: Bearer token →
  `supabase.auth.getUser(token)` → sets `req.user`; `401` on missing/invalid.
- `src/middleware/role.middleware.ts` — `farmerOnly`: reads `profiles.role`; self-heals a
  missing profile row; falls back to auth metadata role; `403` otherwise.
- `src/middleware/admin.middleware.ts`, `src/middleware/fieldOfficer.middleware.ts` — role guards.
- `src/modules/farmer/*` — `farmer.routes.ts` mounts `/auth`, `/profile`, `/dashboard`,
  `/loans`, `/transactions`, `/notifications`, each with controller/routes/service.
- `src/modules/admin/*` — `auth`, `dashboard`, `field-officer` submodules (NOT mounted yet).
- `src/types/express.d.ts` — augments `Express.Request` with `user`.
- `farmer_db.sql` — Supabase schema (see below).
- `.env.example` — env template (no secrets). `package.json`, `package-lock.json`, `tsconfig.json`.

**Database (`server/farmer_db.sql`):** tables `profiles` (FK → `auth.users`, role, status
default `pending`, farmer/land/income/loan fields, `farmer_id`, `is_verified`, `credit_score`,
`member_since`), `transactions`, `loan_applications` (status default `pending`, emi/interest/
installments), `loan_timeline`, `notifications`; storage bucket `farmer-documents`; an
idempotent ALTER block for schema repair. **Missing:** verification, field-visit, audit-log,
and admin (`admin_*`) tables/columns.

**Auth model:** Supabase Auth. Farmers register via `supabase.auth.admin.createUser` with a
synthetic email `${nid}@sofol.local` and `user_metadata.role`; login resolves phone/NID/email
→ `signInWithPassword`. Roles are resolved server-side from `profiles`, never trusted from the client.

---

## Milestone log

### Milestone 0 — Backend baseline import, audit & documentation

- **Feature:** Establish the real backend baseline on `feature/akash` and document it honestly.
- **Status:** Implemented (baseline + docs). Feature roles remain Partial/Planned per table above.
- **Files created:** `server/.env.example` (this session); `README.md` / `AI_README.md` rewritten.
- **Files imported (committed this milestone):** entire `server/` TypeScript backend
  (foundation + full `modules/farmer/`; partial `modules/admin/`).
- **Purpose:** Replace the superseded JS `backend/` skeleton with the TS `server/` as the
  single source of truth; record audit findings so feature work can start from facts.
- **Architecture:** modular Express (Routes → Middleware → Controllers → Services → Supabase).
- **Database changes:** none applied this milestone (schema lives in `farmer_db.sql`, run manually).
- **API endpoints:** `GET /` (health) + `/api/farmer/*` groups mounted; admin not mounted.
- **Auth/authz:** Supabase Auth verification middleware + `farmerOnly` role guard present.
- **Validation:** ad-hoc field checks in services (e.g. `registerFarmer`); no central schema layer yet.
- **Error handling:** generic Express error handler returns `{ message }`; not yet the full
  `{ success, message, data }` contract.
- **Frontend integration:** none (deliberately deferred).
- **Tests:** manual smoke — server boots, `GET /` → `200 {"message":"Sofol api is running"}`,
  protected route → `401`, unknown route → `404` JSON. No automated tests yet.
- **Commits:** `b1548b0` (backend foundation + farmer), `c2624a7` (partial admin), plus this docs commit.
- **Known issues:** see below.
- **Next step:** Milestone 1 — first officer role (Field Officer or Bank Officer), pending
  confirmation of order given Admin creates officer accounts.

---

## Audit findings

1. **Two backends existed.** Origin `feature/akash` carried a JS `backend/` skeleton; the newer
   TS `server/` was imported and is now the real backend. `backend/` is superseded — recommend removal.
2. **Response contract mismatch.** Handlers return `{ message }`, not `{ success, message, data }`.
3. **Admin routes not mounted.** `modules/admin/` code exists but is unreachable (not in `app.ts`).
4. **Missing admin schema.** `admin.sql` referenced by admin auth (`admin_id`, `admin_level`,
   `admin_since`) does not exist.
5. **Schema gaps.** No verification, field-visit, or audit-log tables.
6. **CORS is `*`.** Must be scoped before production.
7. **Security hardening absent.** No helmet, no rate limiting.
8. **`tsconfig` `types: []`.** `tsc --noEmit` can error on Node globals; runtime uses
   `--transpile-only`. Consider adding `@types/node`.
9. **Unused deps.** `jsonwebtoken`, `bcryptjs` are unused (auth is Supabase-based).

---

## Known issues / cross-cutting backlog

- Standardize the `{ success, message, data }` response contract across all handlers.
- Add central request validation (Zod is available in the repo).
- Add security middleware: `helmet`, rate limiting, scoped CORS.
- Add audit logging (who / what / when / target / action) + `audit_logs` table.
- Add schema for verification, field visits, and admin; create `admin.sql`.
- Mount admin routes in `app.ts`.
- Add automated tests (auth, per-role authorization, error codes).
- Remove the superseded JS `backend/` skeleton.

---

## Conventions for future sessions

- Branch: `feature/akash` only. Never push to `main`.
- One logical feature per commit; commit + push after each milestone.
- Update **both** `README.md` and `AI_README.md` every milestone.
- Never commit `.env` or hardcode secrets. Keep `.env.example` current.
- Enforce roles server-side; never trust a client-supplied role.
- Do not document anything as implemented unless it actually works.
