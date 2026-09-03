-- ============================================================
-- SOFOL — Admin module database schema
-- ============================================================
-- HOW TO APPLY:
--   1. Open your Supabase project → SQL Editor → New query.
--   2. Paste this entire file and click "Run".
--   (The Express server uses the service-role key, so it bypasses
--    Row Level Security and can read/write these tables directly.)
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- SECTION 1: EXTEND EXISTING TABLES (idempotent, safe to re-run)
-- ============================================================
-- profiles: an admin has a single row in profiles just like every other
-- authenticated user. The role column already accepts any text; we only
-- add admin-specific metadata fields. They are populated when
-- role = 'admin' and remain null otherwise.
alter table if exists public.profiles
  add column if not exists admin_id text,
  add column if not exists admin_level text default 'standard',
  add column if not EXISTS admin_department text,
  add column if not exists admin_since timestamptz;

-- field_officer_assignments: the admin UI shows when and by whom each
-- assignment was created. The column was originally defined with
-- assigned_by — we only need to ensure it exists (idempotent).
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'field_officer_assignments'
      and column_name = 'assigned_by'
  ) then
    alter table public.field_officer_assignments
      add column assigned_by uuid references public.profiles (id) on delete set null;
  end if;
end $$;

-- ============================================================
-- SECTION 2: NEW TABLES
-- ============================================================

-- ---------- AUDIT LOGS ----------
-- The admin dashboard "Audit Logs" tab reads from this table. Other
-- modules (admin field-officers CRUD, status changes, etc.) write to it
-- through a shared helper. Rows are append-only and never updated.
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
-- Admin-only notifications (e.g. "New field officer created", "User
-- deactivated"). Kept separate from user-level notifications so they can
-- be surfaced on the admin dashboard without leaking personal context.
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
-- SECTION 3: STORAGE BUCKETS
-- ============================================================
-- Admin documents (reports, exported CSVs) — declared here so the
-- storage bucket exists on first deploy.
insert into storage.buckets (id, name, public)
values ('admin-documents', 'admin-documents', true)
on conflict (id) do nothing;

-- ============================================================
-- SECTION 4: SCHEMA REPAIR (idempotent, safe to re-run)
-- ============================================================
-- If the admin tables already existed with an older/partial schema, add
-- any columns introduced after the initial deployment without dropping
-- data. Re-run any time the app reports a "column does not exist" error.

alter table if exists public.audit_logs
  add column if not exists ip_address text,
  add column if not exists user_agent text,
  add column if not exists details jsonb default '{}'::jsonb;

alter table if exists public.admin_notifications
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists read boolean default false;
