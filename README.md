# SOFOL — Farmer Credit Profile Platform

SOFOL is a mobile platform that builds **credit profiles for farmers** so banks can make
informed lending decisions. It serves four roles — **Farmer**, **Field Officer**,
**Bank Officer**, and **Admin** — from a single Expo app backed by an Express + Supabase API.

> **Status:** The Expo frontend is built. The backend is under active development on the
> `feature/akash` branch. See [AI_README.md](AI_README.md) for the detailed, honest
> per-feature implementation status.

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
│   │   ├── middleware/      # auth, role, admin, field-officer guards
│   │   └── modules/         # <role>/<feature>/{controller,routes,service}
│   ├── farmer_db.sql        # Supabase schema (run in the SQL editor)
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
2. Open **SQL Editor → New query**, paste [`server/farmer_db.sql`](server/farmer_db.sql), and **Run**.
3. Copy your **Project URL** and **service-role key** (Project Settings → API) into `server/.env`.

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
| *      | `/api/farmer/profile`       | farmer | Profile read / update    |
| *      | `/api/farmer/dashboard`     | farmer | Dashboard aggregates     |
| *      | `/api/farmer/transactions`  | farmer | Income / expense records |
| *      | `/api/farmer/loans`         | farmer | Loan applications        |
| *      | `/api/farmer/notifications` | farmer | Notifications            |

Admin, Field Officer, and Bank Officer endpoints are in progress — see
[AI_README.md](AI_README.md) for live status.

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

Schema extensions for verification, field visits, audit logs, and admin are planned.

---

## Testing

- Current: manual smoke tests (server boot, health `200`, `401` on protected routes, `404` on unknown routes).
- Planned: automated integration tests (auth, role authorization, per-role endpoints).

---

## Development notes

- Work happens on `feature/akash`. Do not push to `main`.
- Keep business logic in services, not route definitions.
- Follow the existing `modules/<role>/<feature>/{controller,routes,service}` structure.
- Never commit secrets. `.env` files are git-ignored; keep `.env.example` current.
