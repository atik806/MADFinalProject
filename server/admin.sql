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
  add column if not exists supervised_upazila text;

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
-- Visits a field officer schedules / completes for a farmer. The Field
-- Officer milestone builds the write-paths; created here so admin dashboard
-- counts resolve.
create table if not exists public.field_visits (
  id uuid primary key default gen_random_uuid(),
  field_officer_id uuid references public.profiles (id) on delete cascade,
  farmer_id uuid references public.profiles (id) on delete cascade,
  visit_date timestamptz,
  scheduled_date timestamptz,
  completed_date timestamptz,
  status text default 'scheduled',
  purpose text,
  notes text,
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
  verified_by uuid references public.profiles (id) on delete set null,
  status text default 'pending',
  notes text,
  verification_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists farmer_verifications_farmer_idx on public.farmer_verifications (farmer_id);
create index if not exists farmer_verifications_status_idx on public.farmer_verifications (status);

-- ---------- LOAN APPLICATIONS: review columns ----------
-- Used by the admin dashboard and (later) the bank-officer review flow.
alter table if exists public.loan_applications
  add column if not exists verification_status text default 'pending',
  add column if not exists forwarded_at timestamptz;
