# SOFOL — AI Companion (quick orientation)

Concise companion to the two longer docs:

- **[AI_README.md](AI_README.md)** — the durable, honest per-feature technical "memory" (what is
  implemented, partial, planned; exact route/behaviour details and live-verification status).
- **[README.md](README.md)** — human-facing setup, architecture, full API reference, security
  notes, database overview and testing guide.
- **[README_USER.md](README_USER.md)** — end-user/roles guide.

This file is the short orientation so an agent (or engineer) can resume work with minimal reading:
architecture, response contract, role/permission model, where the code lives, and how to verify.

---

## Golden rules

- **Documented ≠ proven.** Nothing counts as "implemented" in `AI_README.md` until it has been
  **run and verified live**. Desk-checked code is explicitly labelled "not live-verified".
- **DB schema work is parked.** Do **not** run new DDL/migrations/RLS changes unplanned. The
  bank-officer columns from `server/admin.sql` **are applied live** and the whole bank-officer
  module is **verified live (94/94)**; treat any unapplied-schema notes in older doc history as
  superseded.
- **Roles are server-resolved, never client-trusted.** The role guard reads `profiles`.role and
  status on every request; Supabase `user_metadata.role` is **never** used for authorization
  (it is client-writable and was the source of a privilege-escalation vector, now closed).
  Demo-only endpoints (`farmer/auth/reset-password`, admin `auth/reseed`) are hard-disabled
  under `NODE_ENV=production`, and `ADMIN_EMAIL`/`ADMIN_PASSWORD` are mandatory in production.
- **Branch discipline.** Work on `feature/akash`, never `main`, never force-push.
- **Secrets.** `.env` files are git-ignored; commit only `.env.example` placeholders.

---

## Architecture

```
Expo app (src/)  --Bearer-->  Express 5 + TS (server/src/)  --service-role-->  Supabase
  expo-router + Context            modular: modules/<role>/<feature>/{controller,routes,service}
```

- **Frontend** — repo root `src/`. File-based routing (`expo-router`), state via React Context.
  Typed API client `src/lib/api.ts`, shared contracts `src/lib/api-types.ts`.
- **Backend** — `server/`, all business logic + the only Supabase access, using the **service-role**
  client (`server/src/config/supabase.ts`) which bypasses RLS. The key never ships to the app.
- **Request flow:** Route → `authenticate` → role guard → Controller → Service → Supabase.

### Response contract

Every endpoint targets `{ success, message, data }`. Admin, farmer, field-officer, and
bank-officer modules all follow it.

### Frontend error model

Every failure becomes an `ApiError` (`src/lib/api.ts`) with a user-safe message. A **401 clears the
session** so the app cannot stay falsely authenticated. Farmers/officers/admin differ only by role;
bank-officer screens run against the live `/api/bank-officer` review API.

---

## Roles & permission matrix

Roles are **never trusted from the client** — the `authenticate` middleware resolves the user, then
role guards read the role from the `profiles` table server-side and re-check `status` on every
request (so suspension takes effect immediately, even with a valid token).

| Role         | Resolved from | Can do (representative)                                  | Writables / guards |
| ------------ | ------------- | -------------------------------------------------------- | ------------------ |
| `farmer`     | `profiles`    | own profile, transactions, loan apply, notifications, dashboard, credit | only own rows; privileged columns (`is_verified`, `credit_score`, `farmer_id`, `role`, `status`) never settable |
| `field_officer` | `profiles`  | assigned-farmer management, verification, visits, loan workflow (draft→submit→verify→forward) | only assigned farmers / owned visits & verifications / authored loans |
| `bank_officer` | `profiles`   | review forward-queue, decision (`approved`/`rejected`) | only forwarded apps; decision not overridable; approve ≤ requested amount |
| `admin`      | `profiles` (env `ADMIN_EMAIL` short-circuits) | user directory, officer provisioning, status changes, farmers directory, dashboard, audit | admin status never changeable (no lockout recovery); all admin actions audit-logged |

Key rules enforced server-side:

- **Farmer** tx/loan/credit/dashboard are scoped to the authenticated farmer (IDOR-proof).
- **Field officer** sees only actively assigned farmers; foreign farmer/visit/loan → 404 (not 403).
- **Bank officer** only ever sees **forwarded** applications; a draft/unforwarded id returns 404 —
  the upstream pipeline cannot be enumerated.
- **Suspension is immediate**: role guards re-read `profiles.status` per request.
- **No client-supplied role/status/privileged fields** are ever trusted (they are stripped or ignored).

---

## Where things are

- Frontend contexts: `src/contexts/` — `Auth`, `Notification`, `Transaction`, `Loan`, `Profile`
  (all session-scoped; the session guard is normalized on `user?.id ?? null` so it converges on
  logout/switch).
- Backend guards: `server/src/middleware/` — `auth`, `role`, `admin`, `fieldOfficer`,
  `bankOfficer`, `security` (helmet, CORS allow-list, rate limits, 1 MiB body, error hygiene).
- API client / types: `src/lib/api.ts`, `src/lib/api-types.ts`.
- SQL schema: `server/farmer_db.sql`, `server/admin.sql` (idempotent; re-run after pulling new columns).

---

## How to verify

Backend must be running and current before E2E. If the server was started earlier, **touch
`server/src/server.ts`** (or restart `npm run dev`) so `ts-node-dev --respawn` picks up the latest
code — a stale process returns spurious 404s.

```bash
# backend (server/)
npm run build                              # tsc → dist/
npm run dev                                # http://localhost:3000

# E2E (against a running server, from server/). All self-provisioning + self-cleaning.
node test/admin.e2e.cjs                    # 81/81
node test/farmer.e2e.cjs                   # 79/79
node test/field-officer.e2e.cjs            # 50/50
node test/field-officer-loans.e2e.cjs      # 48/48
node test/bank-officer.e2e.cjs             # 94/94
node test/security.e2e.cjs                 # 25/25
node test/cleanup.cjs && node test/cleanup-sweep.cjs   # remove test fixtures

# frontend (repo root)
npm run typecheck                          # tsc --noEmit
npm run lint                               # expo lint
```

> The **bank-officer schema is applied live** and `/api/bank-officer` is verified by the
> bank-officer suite (94/94). Run the suites against the current server: if the server was
> started earlier, `touch server/src/server.ts` first (see above).
