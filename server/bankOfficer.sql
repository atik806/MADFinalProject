-- ============================================================
-- SOFOL — Bank Officer module database schema
-- ============================================================
-- HOW TO APPLY:
--   1. Run farmer_db.sql, admin.sql and fieldOfficer.sql first.
--   2. Open your Supabase project -> SQL Editor -> New query.
--   3. Paste this entire file and click "Run".
--   (The Express server uses the service-role key, so it bypasses
--    Row Level Security and can read/write these tables directly.)
--
-- Idempotent and safe to re-run: only adds columns/indexes that do not
-- already exist, never drops data.
-- ============================================================

-- profiles: bank-officer posting details on the officer's own row.
-- employee_id / designation / joining_date are shared with field officers
-- (added in fieldOfficer.sql); these describe the bank branch. Populated
-- only when role = 'bank_officer'.
alter table if exists public.profiles
  add column if not exists bank_name text,
  add column if not exists branch_name text,
  add column if not exists branch_code text;

-- ---------- LOAN APPLICATIONS: bank-officer decision columns ----------
-- The bank officer only ever sees applications a field officer has
-- forwarded (forwarded_at is not null — added in fieldOfficer.sql). These
-- columns record the bank side of the handoff and are kept separate from
-- the officer's verification_* columns so the two verdicts are never
-- conflated:
--   bank_officer_id  — the officer who took the decision
--   reviewed_at      — when the application was moved to 'under_review'
--   decision_at      — when 'approved' / 'rejected' was recorded
--   decision_notes   — the bank's reasoning (officer notes stay in
--                      verification_notes)
--   approved_amount  — the sanctioned amount; may be lower than the
--                      requested amount, never exceeds it
alter table if exists public.loan_applications
  add column if not exists bank_officer_id uuid references public.profiles (id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists decision_at timestamptz,
  add column if not exists decision_notes text,
  add column if not exists approved_amount numeric;

-- The bank queue is "everything forwarded, newest first", so forwarded_at
-- carries both the filter and the ordering.
create index if not exists loan_applications_forwarded_at_idx
  on public.loan_applications (forwarded_at desc);
create index if not exists loan_applications_bank_officer_idx
  on public.loan_applications (bank_officer_id);
