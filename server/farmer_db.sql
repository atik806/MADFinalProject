-- ============================================================
-- SOFOL — Farmer Credit Platform database schema
-- ============================================================
-- HOW TO APPLY:
--   1. Open your Supabase project → SQL Editor → New query.
--   2. Paste this entire file and click "Run".
--   (The Express server uses the service-role key, so it bypasses
--    Row Level Security and can read/write these tables directly.)
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- PROFILES ----------
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

-- ---------- STORAGE BUCKET (public) ----------
-- The server also tries to create this at runtime; this guarantees it exists.
insert into storage.buckets (id, name, public)
values ('farmer-documents', 'farmer-documents', true)
on conflict (id) do nothing;
