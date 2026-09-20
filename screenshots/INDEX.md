# SOFOL — Screen Inventory

90 PNG captures covering **every routable screen** in `src/app` (34 route files), for all
four roles. Captured 2026-09-20.

**How they were taken:** the Expo web build (`npx expo start --web`, `EXPO_PUBLIC_API_URL=http://localhost:3000`)
driven by headless Chrome over the DevTools Protocol, at a 412 × 915 phone viewport, `deviceScaleFactor: 2`
(so each PNG is 824 × 1830). The Express backend ran locally against the project's real hosted Supabase
project, so every number, chart and list is live data, not mock data.

A `-2`, `-3`, `-4` suffix is the *same* screen scrolled further down — screens taller than one
viewport are captured in successive frames.

---

## Public / unauthenticated

| File | Route | Screen |
|---|---|---|
| `01-public-landing` | `/` | Landing / hero |
| `02-public-login` | `/view/login` | Login |
| `03-public-login-validation-errors` | `/view/login` | Login with empty-submit validation errors |
| `04-public-reset-password-step1-phone` | `/view/reset-password` | Reset password — step 1, phone |
| `05-public-reset-password-step2-otp` | `/view/reset-password` | Reset password — step 2, OTP |
| `06-public-reset-password-step3-new-password` | `/view/reset-password` | Reset password — step 3, new password |
| `07-public-officials-portal` | `/officials` | Officials entry (redirects to the shared login) |
| `08-public-officials-login` | `/officials/login` | Officials login |
| `09-public-not-found` | `/this-route-does-not-exist` | What an unmatched URL *actually* shows |
| `09b-public-app-not-found-screen` | `/not-found` | The app's own designed 404 screen |

> 02, 07 and 08 are byte-identical on purpose: `officials/login.tsx` re-exports `view/login.tsx`,
> and `/officials` redirects to it. They are kept separately so the folder maps 1:1 to routes.

## Farmer registration (5-step wizard)

| File | Route | Screen |
|---|---|---|
| `10-registration-step1-personal-empty` | `.../farmer-registration` | Step 1 — Personal, empty |
| `11-registration-step1-validation-errors` | `.../farmer-registration` | Step 1 — validation errors |
| `12-registration-step1-personal-filled` | `.../farmer-registration` | Step 1 — filled |
| `13-registration-step2-land-empty` | `.../land` | Step 2 — Land, empty |
| `14-registration-step2-land-filled` | `.../land` | Step 2 — filled, crops selected |
| `15-registration-step3-income-empty` | `.../income` | Step 3 — Income, empty |
| `16-registration-step3-income-filled` | `.../income` | Step 3 — filled |
| `17-registration-step4-loan` | `.../loan` | Step 4 — Existing loan |
| `18-registration-step4-loan-yes-expanded` | `.../loan` | Step 4 — "Yes" expanded |
| `19-registration-step5-photo-upload` | `.../photo` | Step 5 — Photo upload |
| `20-registration-step5-photo-selected` | `.../photo` | Step 5 — with a photo attached |

## Admin

| File | Route | Screen |
|---|---|---|
| `30-admin-home` | `/officials` (admin group) | Admin dashboard — stats + charts |
| `31-admin-users` | `/officials/users` | User management |
| `32-admin-reports` | `/officials/reports` | Reports |
| `33-admin-audit` | `/officials/audit-logs` | Audit logs |
| `34-admin-settings` | `/officials/settings` | Admin settings |
| `35-admin-farmer-detail` | `/officials/users` | Farmer detail sheet |
| `36-admin-farmer-approved` | `/officials/users` | List after approving a pending farmer |

## Field officer

| File | Route | Screen |
|---|---|---|
| `40-field-officer-home` | `/officials` (field-officer group) | Field officer dashboard |
| `41-field-officer-applications` | `/officials/applications` | Loan applications queue |
| `42-field-officer-visits` | `/officials/visits` | Field visits |
| `43-field-officer-settings` | `/officials/settings` | Settings |
| `44-field-officer-application-expanded` | `/officials/applications` | Application card expanded — timeline + documents |

## Bank officer

| File | Route | Screen |
|---|---|---|
| `50-bank-officer-home` | `/officials` (bank-officer group) | Bank officer dashboard |
| `51-bank-officer-loans` | `/officials/loans` | Loan management |
| `52-bank-officer-approvals` | `/officials/approvals` | Approvals queue |
| `53-bank-officer-settings` | `/officials/settings` | Settings |

## Farmer

| File | Route | Screen |
|---|---|---|
| `60-farmer-dashboard-empty` | `.../farmer-dashboard` | Dashboard — empty state |
| `61-farmer-transactions-empty` | `/view/Transactions/transactions` | Transactions — empty state |
| `62-farmer-loans-empty` | `/view/Loans/loans` | Loans — empty state |
| `63-farmer-notifications` | `/view/Notifications/notifications` | Notifications |
| `64-farmer-profile` | `/view/Profile/profile` | Profile |
| `65-farmer-edit-profile` | `/view/Profile/edit-profile` | Edit profile |
| `66-farmer-settings` | `/view/Settings/farmer-settings` | Farmer settings |
| `67-farmer-add-transaction-empty` | `.../add-transaction` | Add transaction — empty |
| `68-farmer-add-transaction-income-filled` | `.../add-transaction` | Add transaction — income filled |
| `69-farmer-add-transaction-expense-filled` | `.../add-transaction` | Add transaction — expense filled |
| `70-farmer-apply-loan-step1-details` | `/view/Loans/apply-loan` | Apply for loan — step 1 |
| `71-farmer-apply-loan-step1-filled` | `/view/Loans/apply-loan` | Step 1 with EMI preview |
| `72-farmer-apply-loan-step2-documents` | `/view/Loans/apply-loan` | Step 2 — documents |
| `73-farmer-apply-loan-step3-review` | `/view/Loans/apply-loan` | Step 3 — review |
| `74-farmer-loan-submitted` | `/view/Loans/apply-loan` | After submitting |
| `75-farmer-dashboard-populated` | `.../farmer-dashboard` | Dashboard with real data |
| `76-farmer-transactions-populated` | `/view/Transactions/transactions` | Transactions with entries |
| `77-farmer-loans-my-loans` | `/view/Loans/loans` | Loans — "My Loans" tab |
| `78-farmer-loan-applications-tab` | `/view/Loans/loans` | Loans — "My Loan Applications" tab |
| `79-farmer-loan-application-detail` | `.../application-detail` | Loan application detail |

---

## Caveats

- **Web build, not Android.** These render through `react-native-web`. Layout and data are
  faithful, but native-only pieces differ — most visibly the Date of Birth picker
  (`@react-native-community/datetimepicker`) renders nothing on web, so field `12` shows an
  empty DOB. On Android it opens the native date dialog.
- **Demo data created for these captures.** A farmer (Md. Abdul Karim), two transactions and one
  ৳75,000 loan application were created through the real app/API, plus three temporary staff
  accounts (`shot.admin@`, `shot.field@`, `shot.bank@sofol.local`).
