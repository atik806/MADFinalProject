# README_AI — orientation for AI coding agents

Read this first, then `work.md` for the deep architecture reference.

## What this project is

SOFOL — an Expo React Native app (`src/`) plus an Express 5 + TypeScript API
(`server/`) backed by Supabase (PostgreSQL, Auth, Storage). It is an AIUB Mobile
Application Development final-term project. Four roles: farmer, admin, bank-officer,
field-officer.

**The app is no longer "frontend only".** Older notes (and `code.md`) describe an
in-memory prototype and a plan to move straight to Supabase — that is history. The
team built an Express API instead; the app talks to Supabase only through it.

## Ground rules

- **Expo SDK 56.** APIs changed in recent Expo versions — check the versioned docs
  (`https://docs.expo.dev/versions/v56.0.0/`) before using an Expo module. See `AGENTS.md`.
- **Do not commit secrets.** `.env` and `server/.env` are git-ignored; only the
  `.example` files belong in version control. `server/src/config/supabase.ts` will
  refuse to start if `SUPABASE_SERVICE_ROLE_KEY` is not actually a service_role key.
- **This repo does not use Claude attribution trailers** in commit messages.
- Run `npm run typecheck` (root) and `cd server && npm run build` after changes.

## Where things live

| Concern | Path |
|---|---|
| App routes / screens | `src/app/view/**` (farmer), `src/app/officials/**` + `src/features/officials/**` (officials) |
| HTTP client | `src/lib/api.ts` (`api.get/post/put/patch/del`, `ApiError`, `setAuthToken`, 401 handler). `src/config/api.ts` re-exports it. |
| App state | `src/contexts/*.tsx` — `Auth`, `Language`, `Theme`, `Transaction`, `Loan`, `Profile`, `Notification`; `Registration` is scoped to the farmer-registration layout |
| Static option lists | `src/data/*.ts` (dropdown presets, settings copy) — **not** mock domain data anymore |
| API server entry | `server/src/app.ts` (wiring), `server/src/server.ts` (listener) |
| API modules | `server/src/modules/{farmer,admin,fieldOfficer,bankOfficer}/**` — each has `*.routes.ts` / `*.controller.ts` / `*.service.ts` |
| Auth / role guards | `server/src/middleware/**` |
| DB schema | `server/schema.sql` (consolidated) + per-module `*.sql` |

## Session / auth model

`AuthContext` logs in via the API, stores the bearer token in `src/lib/api.ts`
module state via `setAuthToken`, and registers a 401 handler that clears auth state.
The token is **not** persisted to device storage in this milestone (no storage dep is
wired for it), so closing the app ends the session. `AuthContext.isBootstrapping`
gates the root layout on a splash until any restored session is validated.

## Conventions

- Farmer data screens read from a context; the context exposes `loading` and `error`
  and a `reload`/`refresh` function. Screens must render a loading state and an
  error+retry state (not just the happy path).
- All `Pressable` / `TouchableOpacity` need `accessibilityRole` and a meaningful
  `accessibilityLabel` (icon-only controls especially).
- Officials route files under `src/app/officials/(role)/` are one-line re-exports of
  the real screen in `src/features/officials/<role>/screens/`.
- Server responses are `{ data, ... }` or `{ message }` on error; let `ApiError`
  carry the status to the screen.

## Field Officer farmer registration

An authenticated Field Officer is routed to `officials/(field-officer)`. The
dashboard's **Add Farmer** action opens
`officials/field-officer/register-farmer`, which submits the validated form to
`POST /api/field-officer/farmers`. The server assigns the new farmer to the
authenticated officer. The registered profile is created `active` + `is_verified`
(the officer verified identity in person), so **the farmer can log in
immediately**; the success dialog offers **Register Another** (form reset in
place) or **Done**.

## Recent changes on `feature/akash`

- **photo.tsx** — removed nested `<button>`-in-`<button>` markup from the photo
  picker: with a photo the outer element is the single `TouchableOpacity`;
  without one the container is a plain `View` holding the gallery/camera controls.
- **Live NID/phone validation** — `src/lib/validation.ts` exports `FieldStatus`,
  `nidFieldStatus`, `bdPhoneFieldStatus`. The farmer self-registration and the FO
  "Add Farmer" screens render a trailing check/close icon with green/red border as
  the value is typed. The FO zod schema and the server both enforce the canonical
  farmer rules: NID = 10 or 17 digits, phone = valid Bangladeshi mobile.
  Server-side enforcement lives in `farmers.service.ts#registerFarmerByOfficer`
  (mirrors `isFarmerNid` / `isBdPhone`).
- **Calendar DOB picker** — `src/components/DatePicker.tsx`: dependency-free
  `Modal` calendar (month/year navigation, leap-year-safe grid, Cancel/OK via the
  existing `cancel`/`ok` translation keys). The farmer registration DOB field is a
  `Pressable` that opens it; output is `YYYY-MM-DD`, which `parseLooseDate` /
  `isPlausibleDob` accept. The calendar body mounts only while the modal is open,
  so its state resets naturally (no `setState`-in-`useEffect`).
- **Immediate farmer login** — `registerFarmerByOfficer` now inserts the profile
  with `status: 'active'`, `is_verified: true`.
- **FO success flow** — success `Alert` reflects immediate login and adds
  "Register Another".
- **Loan workflow fix** — the FO loan screen could verify but never forward, so
  verified loans never reached the bank queue (which requires `forwarded_at`).
  The screen now calls `POST /api/field-officer/loans/:id/forward` from a
  **Forward to Bank** action shown on verified, not-yet-forwarded applications.
