# SOFOL (সফল) — Farmer Credit Profile Platform

## Overview

A React Native (Expo) app with an **Express + Supabase** backend for a Bangladeshi agricultural fintech scenario. It helps farmers build digital credit histories, manage transactions, apply for loans, and track applications. Includes role-based dashboards for **Admin**, **Bank Officer**, and **Field Officer** roles.

- **App Name:** SOFOL (সফল)
- **Package Slug:** sofolar_app (finalproject)
- **Framework:** Expo Router (file-based routing) + React Native
- **Language:** TypeScript (app and server)
- **Backend:** Express 5 REST API in `server/`, backed by Supabase PostgreSQL / Auth / Storage
- **Data flow:** app → `src/lib/api.ts` → Express API → Supabase (the app never calls Supabase directly)
- **Status:** Backend wired for all four roles. Farmer, admin, field-officer and bank-officer screens call the live API.

---

## Tech Stack

| Category | Packages |
|---|---|
| **Framework** | expo ~56.0.0, react-native 0.85.3, react 19.2.3 |
| **Routing** | expo-router ~56.0.0 (file-based) |
| **Forms & Validation** | react-hook-form 7.80.0, @hookform/resolvers 5.0.0, zod 4.4.3 |
| **Charts** | react-native-svg 15.15.4 (custom SVG charts) |
| **Icons** | @expo/vector-icons ~15.0.0 (Ionicons) |
| **Animations** | react-native-reanimated 4.3.1, react-native-gesture-handler ~2.31.1 |
| **Image Picking** | expo-image-picker ~56.0.19 |
| **Notifications** | expo-notifications ~56.0.19 |
| **Styling** | StyleSheet, expo-linear-gradient ~56.0.4, global CSS (web) |
| **Web Support** | react-native-web ~0.21.0, react-dom 19.2.3 |
| **HTTP client** | `fetch` wrapper in `src/lib/api.ts` (normalized `ApiError`, bearer token, global 401 handler) |
| **Backend** | Express 5, TypeScript, `@supabase/supabase-js` (service-role), helmet, cors, express-rate-limit, jsonwebtoken, bcryptjs, multer |
| **Database** | Supabase PostgreSQL (accessed via PostgREST from the server); schema in `server/schema.sql` |
| **Linting** | ESLint 9 with eslint-config-expo |
| **Package Manager** | npm |

Full dependency list: app `package.json`, server `server/package.json`

---

## Project Structure

```
FinalProject/
├── assets/
│   ├── expo.icon/          # App icon assets
│   └── images/             # Splash, favicon, icons
├── scripts/
│   └── reset-project.js    # Reset project script
├── src/
│   ├── app/                # Expo Router file-based routes
│   │   ├── _layout.tsx     # Root layout — all providers chain
│   │   ├── index.tsx       # Landing page
│   │   ├── not-found.tsx   # 404 page
│   │   ├── view/           # Farmer-facing routes
│   │   │   ├── login.tsx
│   │   │   ├── reset-password.tsx
│   │   │   ├── FarmerDashboard/
│   │   │   ├── FarmerRegistration/
│   │   │   ├── Transactions/
│   │   │   ├── Loans/
│   │   │   ├── Profile/
│   │   │   ├── Notifications/
│   │   │   └── Settings/
│   │   └── officials/      # Officials routes (admin, bank-officer, field-officer)
│   │       ├── _layout.tsx
│   │       ├── index.tsx   # Redirects to /officials/login
│   │       ├── login.tsx   # Re-exports view/login
│   │       ├── (admin)/
│   │       ├── (bank-officer)/
│   │       └── (field-officer)/
│   ├── components/         # Shared UI components
│   │   └── ui/
│   │       └── collapsible.tsx
│   ├── constants/
│   │   ├── theme.ts        # Colors, Fonts, Spacing
│   │   └── translations.ts # i18n (EN/BN)
│   ├── contexts/           # State management (React Context)
│   │   ├── AuthContext.tsx
│   │   ├── LanguageContext.tsx
│   │   ├── LoanContext.tsx
│   │   ├── NotificationContext.tsx
│   │   ├── ProfileContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── TransactionContext.tsx
│   ├── features/
│   │   └── officials/
│   │       ├── admin/      # Admin screens + components
│   │       ├── bank-officer/ # Bank officer screens
│   │       ├── field-officer/ # Field officer screens
│   │       └── shared/     # Shared components, utils, constants
│   ├── hooks/
│   │   ├── use-color-scheme.ts
│   │   ├── use-color-scheme.web.ts
│   │   ├── use-theme.ts
│   │   └── use-translation.ts
│   ├── lib/
│   │   ├── api.ts          # Central API client (fetch wrapper, ApiError, 401 handler)
│   │   └── api-types.ts    # Shared response/row types for the API
│   └── global.css          # Web CSS custom properties
├── server/                 # Express 5 + TypeScript REST API
│   ├── src/app.ts          # helmet, CORS allow-list, json limit, route mounts, error handler
│   ├── src/server.ts       # HTTP listener (PORT, default 3000)
│   ├── src/modules/        # farmer / admin / fieldOfficer / bankOfficer (routes + controller + service)
│   ├── src/middleware/     # auth, role guards, security (helmet/cors/rate-limit)
│   ├── src/config/supabase.ts   # Supabase service-role client (verifies key role)
│   ├── src/lib/postgrest.ts     # Query helpers over Supabase PostgREST
│   └── schema.sql          # Consolidated database schema (+ per-module *.sql)
├── app.json                # Expo config
├── tsconfig.json           # TS config (strict, @/ alias)
├── package.json
├── README.md
├── AGENTS.md
├── CLAUDE.md
├── eslint.config.js
└── expo-env.d.ts
```

---

## Routing / Navigation

### Route Map

| Path | Screen | Access | Description |
|---|---|---|---|
| `/` | Landing (index.tsx) | Public | Hero + Sign In / Get Started |
| `/view/login` | Login | Public | Email/phone + password |
| `/view/reset-password` | Reset Password | Public | 3-step: Phone → OTP → New Password |
| `/view/FarmerDashboard/farmer-dashboard` | Farmer Dashboard | Farmer | Home with custom tab bar |
| `/view/FarmerRegistration/farmer-registration` | Registration Step 1 | Public | Basic Info |
| `/view/FarmerRegistration/land` | Registration Step 2 | Public | Land Info |
| `/view/FarmerRegistration/income` | Registration Step 3 | Public | Income Info |
| `/view/FarmerRegistration/loan` | Registration Step 4 | Public | Existing Loan |
| `/view/FarmerRegistration/photo` | Registration Step 5 | Public | Photo Upload |
| `/view/Transactions/transactions` | Transactions | Farmer | List + filters |
| `/view/Transactions/add-transaction` | Add Transaction | Farmer | New transaction form |
| `/view/Loans/loans` | Loans | Farmer | Active loans + applications |
| `/view/Loans/apply-loan` | Apply Loan | Farmer | 4-step application |
| `/view/Loans/application-detail?id=xxx` | Application Detail | Farmer | Timeline view |
| `/view/Profile/profile` | Profile | Farmer | View profile |
| `/view/Profile/edit-profile` | Edit Profile | Farmer | Edit profile form |
| `/view/Notifications/notifications` | Notifications | Farmer | Notification list |
| `/view/Settings/farmer-settings` | Farmer Settings | Farmer | Preferences |
| `/officials` | Redirect | Public | → /officials/login |
| `/officials/login` | Login | Public | Re-exports view/login |
| `/officials/(admin)/` | Admin Dashboard | Admin | Charts + stats |
| `/officials/(admin)/users` | User Management | Admin | CRUD users |
| `/officials/(admin)/reports` | Reports | Admin | Report types + export |
| `/officials/(admin)/audit-logs` | Audit Logs | Admin | Search + filter logs |
| `/officials/(admin)/settings` | Admin Settings | Admin | Preferences |
| `/officials/(bank-officer)/` | BO Dashboard | Bank Officer | Stats + recent apps |
| `/officials/(bank-officer)/loans` | Loan Management | Bank Officer | Loan list + filters |
| `/officials/(bank-officer)/approvals` | Approvals | Bank Officer | Approve/reject loans |
| `/officials/(bank-officer)/settings` | BO Settings | Bank Officer | Preferences |
| `/officials/(field-officer)/` | FO Dashboard | Field Officer | Assigned farmers |
| `/officials/(field-officer)/applications` | Loan Applications | Field Officer | Verify applications |
| `/officials/(field-officer)/visits` | Field Visits | Field Officer | Schedule/manage visits |
| `/officials/(field-officer)/settings` | FO Settings | Field Officer | Preferences |

### Tab Navigation

- **Farmer:** Custom bottom tab bar (Home, Transactions, Loans, Profile) — rendered manually in each screen, duplicated JSX
- **Admin / Bank Officer / Field Officer:** expo-router `<Tabs>` via shared `RoleTabLayout` component

### Provider Chain (Root Layout — `src/app/_layout.tsx`)

```
AppThemeProvider → LanguageProvider → AuthProvider → NotificationProvider
  → TransactionProvider → LoanProvider → ProfileProvider → ThemeProvider (expo-router) → AuthGate → Slot
```

`AuthGate` holds the app on a splash while `AuthContext.isBootstrapping` is true.
`RegistrationProvider` is **not** in this chain — it wraps only the farmer-registration
stack (`src/app/view/FarmerRegistration/_layout.tsx`).

---

## State Management (8 React Contexts)

| Context | File | Data |
|---|---|---|
| `ThemeContext` | `src/contexts/ThemeContext.tsx` | light/dark toggle, persists to localStorage (web) |
| `LanguageContext` | `src/contexts/LanguageContext.tsx` | en/bn toggle |
| `AuthContext` | `src/contexts/AuthContext.tsx` | user, isBootstrapping, API login/logout, bearer token |
| `NotificationContext` | `src/contexts/NotificationContext.tsx` | Notification[], `loading`, `error`, `reload`, CRUD + markRead (farmer, API-backed) |
| `TransactionContext` | `src/contexts/TransactionContext.tsx` | Transaction[], `loading`, `error`, `reload`, add/remove (farmer, API-backed) |
| `LoanContext` | `src/contexts/LoanContext.tsx` | LoanApplication[], ActiveLoan[], `loading`, `error`, `reload`, addApplication (farmer, API-backed) |
| `ProfileContext` | `src/contexts/ProfileContext.tsx` | FarmerProfile, `loading`, `error`, `reload`, updateProfile (farmer, API-backed) |
| `RegistrationContext` | `src/contexts/RegistrationContext.tsx` | farmer-registration draft (`data`, `patch`, `reset`) — scoped to the registration stack |

Farmer domain data (transactions, loans, profile, notifications) is fetched from the
Express API on login and refreshed on demand. Theme persists on web via localStorage.
The auth bearer token lives in `src/lib/api.ts` module state and is **not** persisted
to device storage in this milestone, so closing the app ends the session.

---

## Data Models

### User (AuthContext)
```typescript
{
  id: string
  name: string
  email: string | null
  phone: string | null
  role: 'farmer' | 'admin' | 'bank-officer' | 'field-officer'
}
```

### Demo Accounts
| Role | Email | Phone | Password |
|---|---|---|---|
| Farmer (Rahim) | farmer@test.com | 01302228993 | 123456 |
| Admin | admin@gmail.com | — | 123456 |
| Bank Officer | bank@gmail.com | — | 123456 |
| Field Officer | field@gmail.com | — | 123456 |

### FarmerProfile (ProfileContext)
```typescript
{
  nameBn, nameEn, nid, phone, dob, gender,
  totalLand, ownLand, leasedLand, selectedCrops[], location,
  farmingIncome, otherSources[], otherIncome, familyMembers, occupation,
  hasLoan, loanAmount, loanPurpose, loanSource,
  profilePhoto, nidPhoto, landPhoto,
  farmerId, isVerified, creditScore, memberSince,
  village, union, upazila, district,
  farmSize, ownership, primaryCrop, secondaryCrop, cropDiversity, experience
}
```

### Transaction (TransactionContext)
```typescript
{
  id, title, description, date, amount,
  category: 'income' | 'expense'
}
```

### LoanApplication (LoanContext)
```typescript
{
  id, title, date,
  status: 'pending' | 'under_review' | 'approved' | 'rejected',
  amount, duration, purpose, installmentType, emi,
  timeline: { step, label, date, completed }[],
  bankOfficer: { name, bank, branch }
}
```

### ActiveLoan (LoanContext)
```typescript
{
  id, title, date, amount, duration, interest, emi,
  progress, installmentsPaid, installmentsTotal,
  nextPaymentDate, nextPaymentAmount
}
```

### Notification (NotificationContext)
```typescript
{
  id, icon, color, title, time, description, read
}
```

---

## Features by Role

### Farmer (12 screens)
- Landing page with hero + branding
- Login / Password reset (3-step: phone → OTP → new password)
- 5-step registration wizard (Basic Info → Land → Income → Existing Loan → Photo)
- Dashboard with credit score gauge, quick actions, recent loans
- Transactions list (filter income/expense, swipe to delete)
- Add transaction (title, amount, category, date)
- Loans view (Active loans + Applications tabs)
- Apply for loan (4-step: amount → duration → EMI → submit)
- Application detail with status timeline
- Profile view / Edit profile
- Notifications (mark read, clear all)
- Settings (language, dark mode, password change, logout)

### Admin (5 screens)
- Dashboard: stats cards, 3 charts (bar/line/donut), quick actions
- User management: search, filter by role/status, add/edit/deactivate users
- Reports: 4 report types, export stubs (PDF/Excel)
- Audit logs: searchable log list with status badges
- Settings: language, dark mode, notifications, 2FA, password change

### Bank Officer (4 screens)
- Dashboard: stats, recent applications, quick actions
- Loan approvals: dual tab (Pending / History), approve/reject with comment
- Loan management: filter tabs (All/Pending/Approved/Rejected/Active), expandable cards
- Settings: language, dark mode, notifications, password change

### Field Officer (4 screens)
- Dashboard: assigned farmers list, quick actions
- Loan applications: filter (All/Pending Verification/Verified/Forwarded), verify/reject
- Field visits: Upcoming/Completed tabs, schedule visit modal
- Settings: language, dark mode, offline maps toggle, auto-sync, biometric auth

---

## Authentication Flow

1. User enters credentials on the login screen
2. `AuthContext.login()` POSTs to the API (`/api/farmer/auth/login` or `/api/admin/auth/login` etc.)
3. On success → store the returned bearer token via `setAuthToken()` in `src/lib/api.ts`,
   set the user, `router.replace()` to the role-specific route:
   - farmer → `/view/FarmerDashboard/farmer-dashboard`
   - admin → `/officials/(admin)/`
   - bank-officer → `/officials/(bank-officer)/`
   - field-officer → `/officials/(field-officer)/`
4. On failure → `ApiError` surfaces a user-facing message ("Invalid credentials")
5. Any authenticated request returning 401 → the global handler in `src/lib/api.ts`
   clears the token and the app returns to the logged-out state
6. Logout → clear token + user → `router.replace('/')`

> **Note:** The server enforces access per role in middleware. The app has no
> client-side route guards — client navigation is driven by the login flow and UI.

---

## Backend (`server/`)

- **Entry:** `server/src/server.ts` starts the listener on `PORT` (default `3000`);
  `server/src/app.ts` wires helmet → CORS allow-list → `express.json({ limit: '1mb' })`
  → route mounts → 404 → error handler (never leaks stack traces).
- **Route mounts:** `/api/farmer`, `/api/admin`, `/api/field-officer`, `/api/bank-officer`.
- **Module shape:** each feature is `*.routes.ts` + `*.controller.ts` + `*.service.ts`
  under `server/src/modules/<role>/<feature>/`.
- **Data access:** `server/src/config/supabase.ts` creates a Supabase client with the
  **service_role** key (it verifies the key's role on boot and refuses a wrong key);
  `server/src/lib/postgrest.ts` wraps common query patterns.
- **Security:** `server/src/middleware/` — JWT auth, per-role guards
  (`admin.middleware.ts`, `bankOfficer.middleware.ts`, `fieldOfficer.middleware.ts`),
  and `security.middleware.ts` (helmet, CORS allow-list, per-IP rate limiting).
- **Database:** run `server/schema.sql` in the Supabase SQL editor. Per-module SQL
  (`admin.sql`, `farmer_db.sql`, `fieldOfficer.sql`, `bankOfficer.sql`) is kept for reference.
- **Env:** `server/.env` (git-ignored) — see `server/.env.example`.

### Minimum-route example (`/api/farmer/transactions`)

`GET /` (list) · `GET /:id` · `POST /` (create) · `PUT /:id` (update) · `DELETE /:id`

---

## Theme System

- **Base theme** (`src/constants/theme.ts`): Colors (light/dark), Fonts (platform-specific), Spacing
- **Officials theme** (`src/features/officials/shared/constants/theme.ts`): Brand greens/blues, dashboard colors, user state colors (verified/pending/rejected)
- **Layout** (`src/features/officials/shared/constants/layout.ts`): contentMaxWidth, shadows, borderRadius
- ThemeContext reads system preference via `useColorScheme()`, persists to localStorage on web
- `global.css` defines CSS custom properties per `data-theme`

---

## Translation System

- File: `src/constants/translations.ts`
- Supports **English** and **Bengali (bn)**
- Hook: `useTranslation()` → returns `{ t(key), lang, toggleLang }`
- Typed with `TranslationKey` — all strings defined in translations.ts

---

## Architecture Patterns & Notes

1. **Re-export pattern for officials:** Route files in `src/app/officials/(role)/` are one-liners re-exporting from `src/features/officials/role/screens/`
2. **Inconsistent tab bars:** Farmer uses custom manual tab bar (duplicated); officials use expo-router `<Tabs>`
3. **Single API client:** every network call goes through `src/lib/api.ts` (`api.get/post/put/patch/del`). It normalizes errors to `ApiError`, injects the bearer token, and clears auth on a 401.
4. **Contexts own fetching + status:** farmer data contexts expose `loading` / `error` / `reload`; screens render a loading state and an error+retry state, not just the happy path.
5. **Multi-step forms as separate screens:** Registration and loan application each use separate route-level screens; the registration draft is held in `RegistrationContext`.
6. **Custom SVG charts:** Bar, Line, Donut charts built from scratch with `react-native-svg`

---

## Notable Absences (Future Work)

- No on-device session persistence — the bearer token is in memory only, so
  closing the app logs the user out
- No client-side route guards (the server enforces roles; the client relies on UI/flow)
- No automated testing (Jest / unit / e2e)
- No CI/CD
- No React error boundaries
- No reusable form abstractions beyond direct react-hook-form usage

---

## Getting Started

### Backend

```bash
cd server
npm install
cp .env.example .env          # fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
# run server/schema.sql in the Supabase SQL editor once
npm run dev                    # http://localhost:3000
```

### App

```bash
npm install
cp .env.example .env           # optional: set EXPO_PUBLIC_API_URL
npx expo start                 # or: npm run android / ios / web

npm run lint
npm run typecheck
```

On a physical device set `EXPO_PUBLIC_API_URL` to your machine's LAN IP
(e.g. `http://192.168.1.10:3000`). Android emulators fall back to `http://10.0.2.2:3000`.

---

## Demo Login Credentials

| Role | Email | Phone | Password |
|---|---|---|---|
| Farmer | farmer@test.com | 01302228993 | 123456 |
| Admin | admin@gmail.com | — | 123456 |
| Bank Officer | bank@gmail.com | — | 123456 |
| Field Officer | field@gmail.com | — | 123456 |

---

## License

See `LICENSE` file.
