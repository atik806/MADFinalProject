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
