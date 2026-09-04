# Final Project Report — Gap Analysis

Compared: `Final_Project_Report_Template.docx` (AIUB MAD, Summer 2025‑26)
Against:   `E:\Mobile App dev\FinalProject` (SOFOL — Expo RN app + Express/Supabase backend)
Date: 2026‑09‑03
Repo: https://github.com/atik806/MADFinalProject (public ✓)

> This is a documentation/analysis file only. No source code was changed.

---

## A. Report sections you currently have NOTHING for in the project

| Report section | Status | What's missing / what to do |
|---|---|---|
| **2.3 System Architecture Diagram** | ❌ Missing | No diagram file exists anywhere in the repo. Draw one (draw.io / Excalidraw) showing RN app → `services` (`src/lib/api.ts`) → Express (`server/`) → Supabase Postgres, with a sample data flow (e.g. add transaction → `POST /api/farmer/transactions` → auth middleware → PostgREST write → response). |
| **4.2 Screen Flow Diagram** | ❌ Missing | No screen-flow diagram. Build one from the route map (a partial map exists in `work.md`). Annotate Tab vs Stack transitions. |
| **Section 3 — API Documentation (written table)** | ⚠️ Code only | All endpoints exist in `server/src/modules/**/**.routes.ts` but there is **no written API doc**. You must fill the Method/Route/Body/Response table in the report. (Route inventory below in section D.) |
| **Section 5 — Per-Student screenshots** | ❌ Missing | `assets/` contains no app screenshots. Each student must capture their own screens. |
| **Section 6 — GitHub Contributors screenshot** | ❌ Missing | Paste GitHub → Insights → Contributors graph. **See teamwork risk in section C.** |
| **EAS Build / APK** (cover page + checklist 8.1 #8/#9) | ❌ Missing | No `eas.json`, no build profile, no APK URL. Run `eas build -p android --profile preview` and put the download link in the report + cover page. |
| **Section 1 — Problem / Solution / Target Users** | ⚠️ Not written | The app concept is described in `work.md` / `README_AI.md` but not as a problem statement. `README.md` is still the default Expo boilerplate. Write this from scratch in the report. |

### Stale / contradictory docs that will mislead the faculty
- `README.md` — still the generic "Welcome to your Expo app" template. Does **not** mention SOFOL, the backend, or the repo.
- `README_AI.md` — **empty file**.
- `work.md` and `code.md` — both describe the app as *"frontend-only prototype — all data is in-memory, no backend API"*. This is **no longer true** (there is a full Express + Supabase backend under `server/`). `code.md` is a Supabase-conversion how-to guide, not project documentation.
- Recommendation: update `README.md` (or add a proper project README) before submission, or at minimum do not rely on these files as evidence.

---

## B. Group Checklist (Report 8.1) — status

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | GitHub repo public + URL in report | ⚠️ | Repo is public ✓. URL is **not** in any repo doc and the report is not filled in — add it. |
| 2 | All members have meaningful commits | ❌ / ⚠️ | Only **2 contributors**: `atik806` (Atik Shahriar, ~144 commits) and `AxisAkash` (Rakibul Islam Akash, ~84 commits). **If the group has more than 2 members, the rest score 0 on Teamwork.** See section C. |
| 3 | ≥1 feature branch + ≥1 merged PR per member | ⚠️ | 12 feature branches, 13 merged PRs — but PRs opened by only 2 people (atik806 ×10, AxisAkash ×3). Fine only for a 2‑person group. No evidence of PR *reviews* (self-merged). |
| 4 | `server/` committed, `node_modules` excluded | ✅ | 89 server files tracked, 0 `node_modules` tracked, `.gitignore` correct. |
| 5 | Express server has ≥5 routes (GET list, GET /:id, POST, PUT/PATCH, DELETE) | ✅ | Easily met. `farmer/transactions` alone has all five. Full inventory in section D. |
| 6 | Real database (not JS array / JSON file) | ✅ | Supabase PostgreSQL via PostgREST (`server/src/lib/postgrest.ts`, `server/src/config/supabase.ts`). SQL schema committed (`server/schema.sql`, `admin.sql`, `farmer_db.sql`, `fieldOfficer.sql`, `bankOfficer.sql`). |
| 7 | Connection string NOT hardcoded (use `.env`) | ✅ | `server/.env` git‑ignored; only `server/.env.example` (placeholders) committed. No keys/JWTs found in tracked files. |
| 8 | EAS preview build (.apk) complete + URL in report | ❌ | No `eas.json`, no build has been run. |
| 9 | .apk installs & launches on a physical Android device | ❌ | Blocked by #8. |
| 10 | Every screen that fetches data has a loading state AND an error state | ⚠️ Partial | **Field‑officer screens**: good (`loadError` + loading). **Admin / bank‑officer**: have `catch` blocks, partial. **Farmer module (dashboard, loans, transactions list, notifications, profile)**: ❌ consume context data but never read the context `loading` flag and show **no error/retry UI** — contexts swallow errors with `console.warn` only. `ActivityIndicator` appears only on form‑submit screens (login, add‑transaction, apply‑loan, edit‑profile, photo). |
| 11 | Custom app icon AND splash (not default Expo purple) | ⚠️ Verify | `assets/images/icon.png` is custom (799 KB) ✓. `assets/images/splash-icon.png` is **3317 bytes — byte‑identical in size to `expo-logo.png`**, i.e. very likely still the default Expo logo. Replace with a SOFOL splash asset. Also `app.json` `ios.icon` points to `./assets/expo.icon` (suspicious path). |
| 12 | `app.json` has valid `bundleIdentifier` + `package` in reverse‑domain format | ❌ | **Neither exists.** `app.json` has no `ios.bundleIdentifier` and no `android.package`. EAS Android build will fail without `android.package` (e.g. `com.sofol.app`). |

---

## C. Teamwork risk (CO2 — assessed per student)

The repo has commits from **exactly two people**:

| Name | GitHub | Commits (approx.) | PRs opened |
|---|---|---|---|
| Atik Shahriar | `atik806` (email `atikrj220@gmail.com`, also shows as "Atik Shahriar" / "atik806") | ~144 | 10 merged |
| Rakibul Islam Akash | `AxisAkash` | ~84 | 3 merged (+1 closed) |

- The two authors are reasonably balanced with each other.
- **Every other group member listed in Section 5 / Section 9 currently has zero commits and zero PRs.** Per the rubric ("No evidence of individual contribution… → 0/10") those members will score 0 on Teamwork and cannot satisfy per‑student checklist items 1 & 2.
- There is no evidence of PR **review** activity (PRs appear self‑merged). Section 6.2 asks for "PRs Reviewed" per member.
- **Action:** if this is a >2 person group, the remaining members need real, attributable commits (own screens/features on their own branches, merged via PR) before the defense. If it is a 2‑person group, Sections 5/6/9 must be trimmed to 2 students.

---

## D. Server route inventory (for Section 3 of the report)

Base URL mounts (`server/src/app.ts`): `/api/farmer`, `/api/admin`, `/api/field-officer`, `/api/bank-officer`. Middleware: `helmet` ✓, CORS allow‑list ✓, `express.json({limit:'1mb'})` ✓, rate limiting ✓, 404 + error handler ✓.

**Farmer**
- `POST /api/farmer/auth/register`, `POST /auth/login`, `POST /auth/reset-password`, `POST /auth/upload`, `GET /auth/me`
- `GET /api/farmer/dashboard`
- `GET /api/farmer/profile`, `PUT /api/farmer/profile`
- `GET /api/farmer/transactions`, `GET /transactions/:id`, `POST /transactions`, `PUT /transactions/:id`, `DELETE /transactions/:id`  ← covers all 5 required verbs + `:id` param
- `GET /api/farmer/loans`, `GET /loans/:id`, `POST /loans`
- `GET /api/farmer/notifications`, `PUT /notifications/:id/read`, `DELETE /notifications/:id`

**Admin** — `POST /auth/login`, `POST /auth/seed`, `GET /auth/me`, `POST /auth/change-password`; `GET /users/counts`, `GET /users`, `GET /users/:id`; `GET|GET/:id|POST|PATCH/:id/status` bank‑officers; `GET|GET/:id|POST|PUT/:id|PATCH/:id/status|POST/:id/reset-password` field‑officers; `GET /loans`, `GET /loans/:id`; `GET /dashboard/stats|registration-trend|loan-analytics|recent-activity|overview`; `GET /audit/logs|summary|notifications`, `POST /audit/notifications/:id/read`, `POST /audit/notifications/read-all`

**Field‑officer** — `GET /profile/me`, `PUT /profile/me`; `GET|GET/:id|POST|PUT/:id` farmers; `GET|POST|GET/:id|PUT/:id|POST/:id/submit|POST/:id/verify|POST/:id/forward` loans; `GET|POST|GET/:id|PUT/:id|POST/:id/complete|POST/:id/cancel` visits; `GET /verification`, `POST /verification/farmers/:id`, `PUT /verification/:id`

**Bank‑officer** — `GET /profile/me`, `PUT /profile/me`; `GET /review`, `GET /review/:id`, `POST /review/:id/review`, `POST /review/:id/decision`

---

## E. Per-Student Checklist (Report 8.2) — project-wide blockers

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | ≥2 features implemented, can explain independently | ⚠️ | Only the 2 active contributors have code to point to. |
| 2 | ≥2 distinct API endpoints called from own screens | ⚠️ | Same — depends on the member actually having wired screens. |
| 3 | All midterm screens completed, polished, functional | ⚠️ | Farmer screens exist and are wired to context; "polished" is weakened by the missing loading/error states (item 5). |
| 4 | **All Pressable elements have `accessibilityLabel` + `accessibilityRole`** | ❌ Fails project‑wide | ~163 `Pressable` + ~185 `TouchableOpacity` across `src/`, but only **2 files** use accessibility props (`logout-button.tsx`, `screen-header.tsx`). Essentially no screen passes this. |
| 5 | Their screens show loading + error state | ❌ for farmer module | See group checklist #10. |
| 6 | Can live‑modify own code during viva | — | Viva; not verifiable here. |
| 7 | Prepared for conceptual questions (hooks/state/nav/API) | — | Viva. |

---

## F. Priority fix list before submission

**Blockers (submission / defense will fail):**
1. Add `android.package` (and `ios.bundleIdentifier`) to `app.json` — required for any Android build.
2. Create `eas.json` with a `preview` profile, run the build, get the `.apk` URL. (cover page + 8.1 #8/#9)
3. Confirm every listed group member has merged PRs with real code — or reduce the group to its actual 2 contributors. (8.1 #2/#3, Section 6, Section 9)

**High (marks deductions):**
4. Add loading + error/retry UI to the farmer data screens (dashboard, loans, transactions, notifications, profile). (8.1 #10, 8.2 #5)
5. Add `accessibilityLabel` + `accessibilityRole` to Pressables across all members' screens. (8.2 #4)
6. Replace `assets/images/splash-icon.png` with a real custom splash; fix `app.json` `ios.icon` path. (8.1 #11)

**Report content to produce (nothing exists yet):**
7. Section 2.3 architecture diagram.
8. Section 4.2 screen‑flow diagram.
9. Section 3 API documentation table (use section D above).
10. Section 5 per‑student screenshots + feature write‑ups.
11. Section 6 Contributors graph screenshot + per‑member commit/PR counts.
12. Section 1 problem statement / solution / target users.
13. Update `README.md` and remove/rewrite the stale "frontend‑only, no backend" claims in `work.md` / `code.md` / empty `README_AI.md`.

**Already satisfied (no action):** real DB (Supabase Postgres), ≥5 REST routes with `:id`, `express.json()` + `cors()` + `helmet` + rate limiting, `.env` not committed / no secrets in tree, `server/` committed without `node_modules`, custom app icon.
