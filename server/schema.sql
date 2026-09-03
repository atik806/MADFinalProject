-- ============================================================
-- SOFOL — consolidated database schema (all modules)
-- ============================================================
-- HOW TO APPLY:
--   Open your Supabase project -> SQL Editor -> New query, paste this
--   whole file, and click "Run".
--
-- This is the four per-module files (farmer_db.sql, admin.sql,
-- fieldOfficer.sql, bankOfficer.sql) merged in dependency order. It is
-- idempotent: every statement is `create ... if not exists` /
-- `add column if not exists`, so it is safe to run on a fresh project or
-- to re-run on an existing one after a code update. It never drops data.
--
-- The Express server connects with the service-role key and bypasses Row
-- Level Security, so no policies are defined here.
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. CORE TABLES (farmer platform)
-- ============================================================

-- ---------- PROFILES ----------
-- One row per authenticated user, for every role. Role-specific columns
-- (admin_*, field-officer, bank-officer) are added further down and are
-- simply null for users of other roles.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text,
  status text default 'pending',
  name_bn text,
  name_en text,
  nid text,
  phone text,
  email text,
  dob text,
  gender text,
  total_land numeric default 0,
  own_land numeric default 0,
  leased_land numeric default 0,
  selected_crops text[] default '{}',
  location text,
  village text,
  union_ text,
  upazila text,
  district text,
  farm_size numeric default 0,
  ownership text,
  primary_crop text,
  secondary_crop text,
  crop_diversity text,
  experience numeric default 0,
  farming_income numeric default 0,
  other_sources text[] default '{}',
  other_income numeric default 0,
  family_members integer default 0,
  occupation text,
  has_loan boolean default false,
  loan_amount numeric default 0,
  loan_purpose text,
  loan_source text,
  profile_photo_url text,
  nid_photo_url text,
  land_photo_url text,
  farmer_id text,
  is_verified boolean default false,
  credit_score integer default 0,
  member_since date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- TRANSACTIONS ----------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid references public.profiles (id) on delete cascade,
  title text,
  description text,
  date text,
  amount numeric,
  category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- LOAN APPLICATIONS ----------
-- The single row that every role touches across the loan lifecycle:
--   farmer creates it -> field officer verifies + forwards -> bank decides.
create table if not exists public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid references public.profiles (id) on delete cascade,
  title text,
  date text,
  status text default 'pending',
  amount numeric,
  duration text,
  purpose text,
  installment_type text,
  emi numeric,
  interest numeric,
  application_date timestamptz default now(),
  -- farmer repayment tracking
  progress integer default 0,
  installments_paid integer default 0,
  installments_total integer default 0,
  next_payment_date text,
  next_payment_amount numeric default 0,
  -- field-officer verification / hand-off
  field_officer_id uuid references public.profiles (id),
  verification_status text default 'pending',
  verified_at timestamptz,
  verification_notes text,
  forwarded_at timestamptz,
  forwarded_by uuid references public.profiles (id),
  recommended_amount numeric,
  -- bank-officer decision
  bank_officer_id uuid references public.profiles (id),
  reviewed_at timestamptz,
  decision_at timestamptz,
  decision_notes text,
  approved_amount numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- LOAN TIMELINE ----------
create table if not exists public.loan_timeline (
  id uuid primary key default gen_random_uuid(),
  loan_application_id uuid references public.loan_applications (id) on delete cascade,
  step integer,
  label text,
  completed boolean default false,
  created_at timestamptz default now()
);

-- ---------- NOTIFICATIONS ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  icon text,
  color text,
  title text,
  description text,
  read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- 2. ADMIN MODULE
-- ============================================================

-- profiles: admin-only metadata
alter table if exists public.profiles
  add column if not exists admin_id text,
  add column if not exists admin_level text default 'standard',
  add column if not exists admin_department text,
  add column if not exists admin_since timestamptz;

-- ---------- AUDIT LOGS ----------
-- Append-only. Every officer / admin mutation writes one row through a
-- shared helper. No FK on actor_id / target_id so a log row survives the
-- deletion of whatever it references and logging can never block an action.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role text,
  actor_name text,
  action text not null,
  module text not null,
  target_id text,
  target_type text,
  status text default 'success',
  details jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists idx_audit_logs_actor_id on public.audit_logs (actor_id);
create index if not exists idx_audit_logs_module on public.audit_logs (module);
create index if not exists idx_audit_logs_status on public.audit_logs (status);
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);

-- ---------- ADMIN NOTIFICATIONS ----------
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  category text default 'system',
  severity text default 'info',
  actor_id uuid references public.profiles (id) on delete set null,
  target_id text,
  metadata jsonb default '{}'::jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_admin_notif_read on public.admin_notifications (read);
create index if not exists idx_admin_notif_created_at on public.admin_notifications (created_at desc);
create index if not exists idx_admin_notif_category on public.admin_notifications (category);

-- ============================================================
-- 3. FIELD OFFICER MODULE
-- ============================================================

-- profiles: field-officer-specific metadata
alter table if exists public.profiles
  add column if not exists employee_id text,
  add column if not exists designation text,
  add column if not exists office_address text,
  add column if not exists joining_date text,
  add column if not exists supervised_district text,
  add column if not exists supervised_upazila text;

create index if not exists loan_applications_verification_status_idx
  on public.loan_applications (verification_status);

-- ---------- FIELD OFFICER <-> FARMER ASSIGNMENTS ----------
create table if not exists public.field_officer_assignments (
  id uuid primary key default gen_random_uuid(),
  field_officer_id uuid references public.profiles (id) on delete cascade,
  farmer_id uuid references public.profiles (id) on delete cascade,
  status text default 'active',
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (field_officer_id, farmer_id)
);

create index if not exists foa_field_officer_idx on public.field_officer_assignments (field_officer_id);
create index if not exists foa_farmer_idx on public.field_officer_assignments (farmer_id);

-- ---------- FIELD VISITS ----------
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
-- History-preserving: every verification submission inserts a new row.
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

-- ============================================================
-- 4. BANK OFFICER MODULE
-- ============================================================

-- profiles: bank-officer branch posting (employee_id / designation /
-- joining_date are shared with field officers, added above)
alter table if exists public.profiles
  add column if not exists bank_name text,
  add column if not exists branch_name text,
  add column if not exists branch_code text;

create index if not exists loan_applications_forwarded_at_idx
  on public.loan_applications (forwarded_at desc);
create index if not exists loan_applications_bank_officer_idx
  on public.loan_applications (bank_officer_id);

-- ============================================================
-- 5. STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('farmer-documents', 'farmer-documents', true),
  ('admin-documents', 'admin-documents', true)
on conflict (id) do nothing;

-- ============================================================
-- 6. SCHEMA REPAIR (for databases created before this consolidation)
-- ============================================================
-- No-ops on a fresh database. Re-run any time the app reports a
-- "column does not exist" error after a code update.

alter table if exists public.notifications
  add column if not exists user_id uuid references public.profiles (id) on delete cascade,
  add column if not exists icon text,
  add column if not exists color text,
  add column if not exists description text,
  add column if not exists read boolean default false;

alter table if exists public.loan_applications
  add column if not exists progress integer default 0,
  add column if not exists installments_paid integer default 0,
  add column if not exists installments_total integer default 0,
  add column if not exists next_payment_date text,
  add column if not exists next_payment_amount numeric default 0,
  add column if not exists field_officer_id uuid references public.profiles (id),
  add column if not exists verification_status text default 'pending',
  add column if not exists verified_at timestamptz,
  add column if not exists verification_notes text,
  add column if not exists forwarded_at timestamptz,
  add column if not exists forwarded_by uuid references public.profiles (id),
  add column if not exists recommended_amount numeric,
  add column if not exists bank_officer_id uuid references public.profiles (id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists decision_at timestamptz,
  add column if not exists decision_notes text,
  add column if not exists approved_amount numeric;

alter table if exists public.audit_logs
  add column if not exists ip_address text,
  add column if not exists user_agent text,
  add column if not exists actor_role text,
  add column if not exists actor_name text,
  add column if not exists target_type text,
  add column if not exists details jsonb default '{}'::jsonb;

alter table if exists public.admin_notifications
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists read boolean default false;

alter table if exists public.field_officer_assignments
  add column if not exists assigned_by uuid references public.profiles (id) on delete set null,
  add column if not exists status text default 'active';

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
