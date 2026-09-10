# SOFOL (সফল) — Farmer Credit Profile Platform

A React Native (Expo) mobile app with an Express + Supabase backend for a Bangladeshi
agricultural fintech scenario. Farmers build a digital credit history, record
transactions, apply for loans and track applications; **Admin**, **Bank Officer** and
**Field Officer** roles get their own dashboards for user management, loan review,
verification and field visits.

> Final Term Project — Mobile Application Development (CSC 4272), Summer 2025‑26, AIUB.

---

## Repository layout

This repo is a small monorepo — the Expo app at the root, the API server in `server/`.

```
FinalProject/
├── src/                    # Expo app (expo-router, file-based routes)
│   ├── app/                # Route screens
│   │   ├── view/           # Farmer-facing screens
│   │   └── officials/      # Admin / bank-officer / field-officer screens
│   ├── contexts/           # State management (React Context + useReducer/useState)
│   ├── features/officials/ # Officials screens, hooks, shared UI
│   ├── lib/api.ts          # Central API client (fetch wrapper, ApiError, 401 handling)
│   └── config/api.ts       # Thin re-export of lib/api (legacy import path)
├── server/                 # Express 5 API (TypeScript)
│   ├── src/app.ts          # App wiring: helmet, CORS allow-list, json limit, routes
│   ├── src/server.ts       # HTTP listener (PORT, default 3000)
│   ├── src/modules/        # farmer / admin / fieldOfficer / bankOfficer route modules
│   ├── src/middleware/     # auth, role guards, security (helmet/cors/rate-limit)
│   ├── src/config/supabase.ts   # Supabase service-role client (verifies key role)
│   ├── src/lib/postgrest.ts     # Query helpers over Supabase PostgREST
│   └── *.sql               # Database schema (schema.sql = consolidated)
├── assets/                 # App icon, splash, images
├── app.json                # Expo config
└── REPORT_GAP_ANALYSIS.md  # Checklist gap analysis vs the report template
```

---

## Architecture

```
┌────────────────────┐     HTTPS/JSON      ┌────────────────────┐    PostgREST     ┌──────────────┐
│  Expo RN app       │  ───────────────▶   │  Express 5 API     │  ─────────────▶  │  Supabase    │
│  (src/)            │   src/lib/api.ts    │  (server/)         │  service-role   │  PostgreSQL  │
│  expo-router       │  ◀───────────────   │  helmet + CORS +   │  ◀────────────  │  + Auth      │
│  React Context     │                     │  rate limit + JWT  │                 │  + Storage   │
└────────────────────┘                     └────────────────────┘                 └──────────────┘
```

- The app never talks to Supabase directly. All reads/writes go through the Express API.
- `src/lib/api.ts` is the single HTTP client: base-URL resolution, bearer-token
  injection, timeout, and a normalized `ApiError` so screens never see raw fetch errors.
  A global 401 handler clears the session.
- The server authenticates with the Supabase **service_role** key and enforces
  per-role access in middleware (`server/src/middleware/`). It applies `helmet`,
  an allow-list CORS policy, a 1 MiB JSON body cap and per-IP rate limiting.
- Database schema lives in `server/schema.sql` (plus the per-module `*.sql` files).

---

## Prerequisites

- Node.js 20+ and npm
- A Supabase project (URL + **service_role** key)
- Android device/emulator or Expo Go for the app

---

## Setup

### 1. Backend (`server/`)

```bash
cd server
npm install
cp .env.example .env        # then fill in the values below
```

`server/.env`:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key (bypasses RLS). **Never** ship to the app. |
| `SUPABASE_ANON_KEY` | Optional, reserved for future least-privilege use |
| `PORT` | HTTP port (default `3000`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrap admin account (change before any real use) |
| `CORS_ORIGINS` | Comma-separated allow-list; empty falls back to Expo dev origins |

Apply the schema once — open the Supabase SQL editor and run `server/schema.sql`.

Run the server:

```bash
npm run dev      # ts-node-dev, auto-reload  → http://localhost:3000
# or
npm run build && npm start
```

Health check: `GET http://localhost:3000/` → `{ "message": "Sofol api is running" }`

### 2. App (root)

```bash
npm install
cp .env.example .env         # optional
npx expo start
```

`.env` (root):

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend base URL. If unset the client uses `http://10.0.2.2:3000` on Android emulators and `http://localhost:3000` elsewhere. Set it to your machine's LAN IP (e.g. `http://192.168.1.10:3000`) when testing on a physical device. |

Scripts: `npm run android` · `npm run ios` · `npm run web` · `npm run lint` · `npm run typecheck`

---

## Demo accounts

Seeded/bootstrapped on the backend (see `server/.env.example` and the admin auth module):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@gmail.com` | `123456` |
| Bank Officer | `bank@gmail.com` | `123456` |
| Field Officer | `field@gmail.com` | `123456` |
| Farmer | `farmer@test.com` (phone `01302228993`) | `123456` |

> Change these before any non-classroom deployment.

---

## API surface

Mounted in `server/src/app.ts`:

| Prefix | Module |
|---|---|
| `/api/farmer` | auth, dashboard, profile, transactions (full CRUD), loans, notifications |
| `/api/admin` | auth, users, bank-officers, field-officers, loans, dashboard, audit |
| `/api/field-officer` | profile, farmers, loans, visits, verification |
| `/api/bank-officer` | profile, review (list / detail / review / decision) |

Every module follows REST conventions — e.g. `/api/farmer/transactions` exposes
`GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`. See the route files under
`server/src/modules/**/**.routes.ts` for the complete list.

Field Officers reach their role-specific dashboard after login. Its **Add Farmer**
action opens the farmer registration form and submits to
`POST /api/field-officer/farmers`; the authenticated server role guard creates
the farmer with role `farmer`, sets the profile to **active** and **verified**
(immediate login eligibility), and assigns the new record to that officer.

### Farmer registration & loan workflow

- **Farmer self-registration** (`src/app/view/FarmerRegistration/`) validates the
  NID (10 or 17 digits) and Bangladeshi phone number **live** — a check/close icon
  and green/red border appear as the user types — and picks the date of birth from
  a calendar modal (`src/components/DatePicker.tsx`) instead of a free-text field.
  Impossible dates are structurally impossible to select, and plausible-age (14–120)
  checks still reject too-young/too-old values.
- **Field Officer registration** applies the same canonical NID/phone rules
  client- *and* server-side and stamps the new farmer `active` + `is_verified`, so
  the farmer can log in immediately with the temporary password. The success dialog
  offers **Register Another** (resets the form in place) or **Done**.
- **Loan lifecycle** — farmer applies (`POST /api/farmer/loans`) → the assigned
  Field Officer verifies (`/api/field-officer/loans/:id/verify`) and then
  **forwards** (`/api/field-officer/loans/:id/forward`, wired to the "Forward to
  Bank" action in the app) → the Bank Officer reviews
  (`/api/bank-officer/loans/:id/review`) and decides
  (`/api/bank-officer/loans/:id/decision`). Only forwarded, field-verified loans
  reach the bank queue; decisions can never be silently flipped.

---

## Documentation

- `work.md` — app architecture, route map, contexts, data models, theme & i18n
- `README_AI.md` — orientation for AI coding agents working in this repo
- `code.md` — *historical* Supabase-conversion plan (superseded by the `server/` API)
- `REPORT_GAP_ANALYSIS.md` — what still needs doing for the report submission

## License

See `LICENSE`.
