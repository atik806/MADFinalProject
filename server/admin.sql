-- ============================================================
-- SOFOL — Admin / Officer / Audit schema
-- ============================================================
-- HOW TO APPLY:
--   1. Open your Supabase project → SQL Editor → New query.
--   2. First run farmer_db.sql (base tables), then paste this file and Run.
--   (The Express server uses the service-role key and bypasses RLS.)
--
-- This file is idempotent and safe to re-run: it only creates tables/columns
-- that do not already exist and never drops data.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- PROFILES: admin + field-officer columns ----------
-- The base profiles table (farmer_db.sql) is shared by all roles. These
-- columns are used by admin and field-officer accounts.
alter table if exists public.profiles
  -- admin-specific
  add column if not exists admin_id text,
  add column if not exists admin_level text,
  add column if not exists admin_department text,
  add column if not exists admin_since timestamptz,
  -- field-officer-specific
  add column if not exists employee_id text,
  add column if not exists designation text,
  add column if not exists office_address text,
  add column if not exists joining_date text,
  add column if not exists supervised_district text,
  add column if not exists supervised_upazila text,
  -- bank-officer-specific (employee_id / designation / joining_date above are
  -- shared with field officers; these describe the bank posting)
  add column if not exists bank_name text,
  add column if not exists branch_name text,
  add column if not exists branch_code text;

-- ---------- AUDIT LOGS ----------
-- Who did what, when, to which target. Deliberately has NO foreign keys on
-- actor_id / target_id so an audit row is never lost if the referenced row
-- is later removed, and so logging can never block the action it records.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_role text,
  actor_name text,
  action text not null,
  module text,
  target_id uuid,
  target_type text,
  status text default 'success',
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_module_idx on public.audit_logs (module);

-- ---------- FIELD OFFICER ↔ FARMER ASSIGNMENTS ----------
-- Which farmers a field officer is responsible for.
create table if not exists public.field_officer_assignments (
  id uuid primary key default gen_random_uuid(),
  field_officer_id uuid references public.profiles (id) on delete cascade,
  farmer_id uuid references public.profiles (id) on delete cascade,
  status text default 'active',
  assigned_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (field_officer_id, farmer_id)
);

create index if not exists foa_field_officer_idx on public.field_officer_assignments (field_officer_id);
create index if not exists foa_farmer_idx on public.field_officer_assignments (farmer_id);

-- ---------- FIELD VISITS ----------
-- Visits a field officer schedules / completes for a farmer.
create table if not exists public.field_visits (
  id uuid primary key default gen_random_uuid(),
  field_officer_id uuid references public.profiles (id) on delete cascade,
  farmer_id uuid references public.profiles (id) on delete cascade,
  visit_date timestamptz,
  status text default 'scheduled',
  purpose text,
  notes text,
  location text,
  visit_type text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists field_visits_officer_idx on public.field_visits (field_officer_id);
create index if not exists field_visits_farmer_idx on public.field_visits (farmer_id);
create index if not exists field_visits_visit_date_idx on public.field_visits (visit_date);

-- ---------- FARMER VERIFICATIONS ----------
-- A field officer's verification of a farmer's profile/documents.
create table if not exists public.farmer_verifications (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid references public.profiles (id) on delete cascade,
  field_officer_id uuid references public.profiles (id),
  status text default 'pending',
  notes text,
  verification_type text not null,
  verified_at timestamptz,
  photo_urls text[] default '{}',
  documents_checked text[] default '{}',
  farmer_present boolean default false,
  land_verified boolean default false,
  documents_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists farmer_verifications_farmer_idx on public.farmer_verifications (farmer_id);
create index if not exists farmer_verifications_status_idx on public.farmer_verifications (status);

-- ---------- SCHEMA REPAIR (idempotent, safe to re-run) ----------
-- Layers the current field-visit / verification columns onto older tables
-- without dropping data. Re-run any time a "column does not exist" error
-- appears after upgrading. verification_type can only be backfilled for
-- existing rows when a sensible default is known; new rows always provide it.

alter table if exists public.field_visits
  add column if not exists location text,
  add column if not exists visit_type text;

alter table if exists public.farmer_verifications
  add column if not exists field_officer_id uuid references public.profiles (id),
  add column if not exists verification_type text,
  add column if not exists verified_at timestamptz,
  add column if not exists photo_urls text[] default '{}',
  add column if not exists documents_checked text[] default '{}',
  add column if not exists farmer_present boolean default false,
  add column if not exists land_verified boolean default false,
  add column if not exists documents_verified boolean default false;

create index if not exists field_visits_visit_date_idx on public.field_visits (visit_date);

-- ---------- LOAN APPLICATIONS: review columns ----------
-- Used by the admin dashboard and the field-officer / bank-officer review
-- flow. verification_status tracks the officer verdict; forwarded_at/by mark
-- hand-off to the bank; recommended_amount is the officer's suggestion.
alter table if exists public.loan_applications
  add column if not exists verification_status text default 'pending',
  add column if not exists forwarded_at timestamptz;

-- Field-officer loan workflow columns. The officer who created the draft and
-- the officer who verified it are recorded separately from the farmer so the
-- bank can see exactly who handled the application in the field.
alter table if exists public.loan_applications
  add column if not exists field_officer_id uuid references public.profiles (id),
  add column if not exists verified_at timestamptz,
  add column if not exists verification_notes text,
  add column if not exists forwarded_by uuid references public.profiles (id),
  add column if not exists recommended_amount numeric;

create index if not exists loan_applications_farmer_idx on public.loan_applications (farmer_id);
create index if not exists loan_applications_status_idx on public.loan_applications (status);
create index if not exists loan_applications_verification_status_idx on public.loan_applications (verification_status);

-- ---------- LOAN APPLICATIONS: bank-officer decision columns ----------
-- The bank officer picks up ONLY applications a field officer has forwarded
-- (forwarded_at is not null). These columns record the bank side of the
-- handoff and are kept separate from the officer's verification_* columns so
-- the two verdicts are never conflated:
--   bank_officer_id  — the officer who took the decision
--   reviewed_at      — when the application was moved to 'under_review'
--   decision_at      — when 'approved' / 'rejected' was recorded
--   decision_notes   — the bank's reasoning (officer notes stay in
--                      verification_notes)
--   approved_amount  — the sanctioned amount, which may be lower than the
--                      requested amount and never exceeds it
alter table if exists public.loan_applications
  add column if not exists bank_officer_id uuid references public.profiles (id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists decision_at timestamptz,
  add column if not exists decision_notes text,
  add column if not exists approved_amount numeric;

-- The bank queue is "everything that has been forwarded, newest first", so
-- forwarded_at carries the filter and the ordering.
create index if not exists loan_applications_forwarded_at_idx on public.loan_applications (forwarded_at desc);
create index if not exists loan_applications_bank_officer_idx on public.loan_applications (bank_officer_id);
