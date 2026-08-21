# SOFOL — Backend Conversion Guide (Demo Data → Supabase)

This guide converts the SOFOL agricultural loan app from **in-memory demo data** to a real **Supabase** backend, step by step. Every section has copy-paste-ready code and tells you exactly which file to edit.

---

## 0. How the app works today (the demo data)

All data currently lives in **memory** — nothing is persisted:

| Where | What it stores |
|---|---|
| `src/data/auth.ts` | `DEMO_USERS` — hardcoded logins (`01302228993/123456`, `admin@gmail.com`, etc.) |
| `src/data/farmers.ts` | `MOCK_FARMERS`, `initialUsers`, `FARMER_NAMES` |
| `src/data/loans.ts` | `defaultApplications`, `defaultActiveLoans` |
| `src/data/transactions.ts` | `defaultTransactions` |
| `src/data/notifications.ts` | `DEFAULT_NOTIFICATIONS` |
| `src/data/profile.ts` | `defaultProfile` (the farmer's profile) |
| `src/data/field-officer.ts` | `UPCOMING_VISITS`, `COMPLETED_VISITS`, `SCHEDULED_TASKS` |
| `src/data/admin.ts` | `MOCK_LOGS`, `heroStats`, charts data |
| `src/data/options.ts`, `settings.ts` | Static dropdown options & settings (keep as-is, no DB needed) |
| `src/contexts/*.tsx` | React Contexts that initialize state from those demo files and mutate it in-memory (`AuthContext`, `LoanContext`, `TransactionContext`, `NotificationContext`, `ProfileContext`) |

Login flow (`src/contexts/AuthContext.tsx:57-72`): simulates 1.2s delay, then searches `DEMO_USERS` for a matching identifier+password. Everything else reads from the demo arrays.

### The 5-step farmer registration
`src/app/view/FarmerRegistration/` has 5 screens (`farmer-registration` → `land` → `income` → `loan` → `photo`). Each screen holds its own `useState` and **does not save anything** — the final screen just navigates to the dashboard (`photo.tsx:113-117`). This is one of the biggest gaps you'll fix.

### The roles
`'farmer' | 'admin' | 'bank-officer' | 'field-officer'` — see `getRouteForRole()` in `AuthContext.tsx:96`.

> Goal: replace every `src/data/*.ts` mock with Supabase queries, keeping the **same TypeScript shapes** so the UI screens need almost no changes.

---

## 1. Create the Supabase project

1. Go to https://supabase.com → **New project** → pick a name (e.g. `sofol`) and a strong DB password.
2. After creation, open **Project Settings → API** and copy:
   - **Project URL** (e.g. `https://xxxx.supabase.co`)
   - **anon public key** (use in the app)
   - **service_role key** (NEVER put this in the app — only in your seed script / server)
3. In **Authentication → Providers**, enable **Email** provider. For phone login also enable **Phone** (needs an SMS provider like Twilio; if you don't have one, use email login and store the phone in the profile — the guide below uses email+password for all roles).

---

## 2. Database schema (SQL)

Open **SQL Editor** in the Supabase dashboard and run each block below.

### 2.1 `profiles` — every user + the farmer profile

Maps from `FarmerProfile` (`src/contexts/ProfileContext.tsx`) + the `User` object + admin list fields.

```sql
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'farmer'
    check (role in ('farmer','admin','bank-officer','field-officer')),
  status text not null default 'pending'
    check (status in ('verified','pending','rejected')),

  -- identity (matches Step 1 of registration)
  name_bn text,
  name_en text,
  nid text,
  phone text,
  email text,
  dob text,
  gender text,

  -- land (Step 2)
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
  experience int default 0,

  -- income (Step 3)
  farming_income numeric default 0,
  other_sources text[] default '{}',
  other_income numeric default 0,
  family_members int default 0,
  occupation text,

  -- existing loan (Step 4)
  has_loan boolean default false,
  loan_amount numeric default 0,
  loan_purpose text,
  loan_source text,

  -- photos (Step 5)
  profile_photo_url text,
  nid_photo_url text,
  land_photo_url text,

  -- app profile extras
  farmer_id text,
  is_verified boolean default false,
  credit_score int default 0,
  member_since date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 2.2 `loan_applications` — matches `LoanApplication` + `apply-loan.tsx`

```sql
create table public.loan_applications (
  id text primary key,            -- keeps the visible format: 'L-2024-001'
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  date text not null,             -- formatted string used by the UI
  status text not null default 'pending'
    check (status in ('pending','under_review','approved','rejected','active','completed')),
  amount numeric not null default 0,
  duration text,
  purpose text,
  installment_type text not null default 'monthly'
    check (installment_type in ('monthly','seasonal')),
  emi numeric default 0,
  interest numeric default 9,
  documents jsonb default '{}',   -- { nid, landDocument, farmPhotograph, previousLoanStatement }
  timeline jsonb default '[]',    -- [{ label, date, status }]
  bank_officer jsonb default '{}',-- { name, bank, branch }
  review_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 2.3 `active_loans` — matches `ActiveLoan`

```sql
create table public.active_loans (
  id text primary key,
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  date text,
  amount numeric default 0,
  duration text,
  interest text,
  emi numeric default 0,
  progress int default 0,
  installments_paid int default 0,
  installments_total int default 0,
  next_payment_date text,
  next_payment_amount numeric default 0,
  created_at timestamptz not null default now()
);
```

### 2.4 `transactions` — matches `Transaction`

```sql
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  date text,
  amount numeric not null default 0,   -- positive = income, negative = expense
  category text not null default 'Expense',
  created_at timestamptz not null default now()
);
```

### 2.5 `notifications` — matches `Notification`

```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  icon text,
  color text,
  title text not null,
  description text,
  time text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
```

### 2.6 `field_visits` — matches `FieldVisit` (field-officer screens)

```sql
create table public.field_visits (
  id text primary key,             -- visible format: 'VIS-001'
  field_officer_id uuid references public.profiles(id) on delete set null,
  farmer_id uuid references public.profiles(id) on delete set null,
  farmer_name text not null,
  location text,
  date text,
  purpose text,
  status text not null default 'scheduled'
    check (status in ('scheduled','in-progress','completed','cancelled')),
  notes text,
  created_at timestamptz not null default now()
);
```

### 2.7 `audit_logs` — matches `LogEntry` (admin screen)

```sql
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  user_name text,
  action text not null,
  module text not null default 'User'
    check (module in ('User','Loan','System')),
  status text not null default 'success'
    check (status in ('success','pending','failed')),
  time text,
  created_at timestamptz not null default now()
);
```

---

## 3. Row Level Security (RLS)

Run in the SQL editor. This is what makes your app secure — without it the API rejects everything by default.

```sql
-- Helper: is this auth user an admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer as
$$ select coalesce((select role from public.profiles where id = auth.uid()), '') = 'admin' $$;

create or replace function public.is_field_officer()
returns boolean language sql stable security definer as
$$ select coalesce((select role from public.profiles where id = auth.uid()), '') = 'field-officer' $$;

create or replace function public.is_bank_officer()
returns boolean language sql stable security definer as
$$ select coalesce((select role from public.profiles where id = auth.uid()), '') = 'bank-officer' $$;

-- Enable RLS everywhere
alter table public.profiles enable row level security;
alter table public.loan_applications enable row level security;
alter table public.active_loans enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.field_visits enable row level security;
alter table public.audit_logs enable row level security;

-- ===== profiles =====
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
  using (auth.uid() = id or public.is_admin() or public.is_field_officer() or public.is_bank_officer());

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update
  using (auth.uid() = id or public.is_admin());

-- ===== loan_applications =====
drop policy if exists "loans_select" on public.loan_applications;
create policy "loans_select" on public.loan_applications for select
  using (auth.uid() = farmer_id or public.is_admin() or public.is_field_officer() or public.is_bank_officer());

drop policy if exists "loans_insert" on public.loan_applications;
create policy "loans_insert" on public.loan_applications for insert
  with check (auth.uid() = farmer_id);

drop policy if exists "loans_update" on public.loan_applications;
create policy "loans_update" on public.loan_applications for update
  using (auth.uid() = farmer_id or public.is_field_officer() or public.is_bank_officer() or public.is_admin());

-- ===== active_loans =====
drop policy if exists "active_loans_select" on public.active_loans;
create policy "active_loans_select" on public.active_loans for select
  using (auth.uid() = farmer_id or public.is_admin() or public.is_bank_officer());

drop policy if exists "active_loans_insert" on public.active_loans;
create policy "active_loans_insert" on public.active_loans for insert
  with check (public.is_bank_officer() or public.is_admin());

drop policy if exists "active_loans_update" on public.active_loans;
create policy "active_loans_update" on public.active_loans for update
  using (auth.uid() = farmer_id or public.is_bank_officer() or public.is_admin());

-- ===== transactions =====
drop policy if exists "transactions_select" on public.transactions;
create policy "transactions_select" on public.transactions for select
  using (auth.uid() = farmer_id or public.is_admin());

drop policy if exists "transactions_insert" on public.transactions;
create policy "transactions_insert" on public.transactions for insert
  with check (auth.uid() = farmer_id or public.is_admin());

drop policy if exists "transactions_delete" on public.transactions;
create policy "transactions_delete" on public.transactions for delete
  using (auth.uid() = farmer_id or public.is_admin());

drop policy if exists "transactions_update" on public.transactions;
create policy "transactions_update" on public.transactions for update
  using (auth.uid() = farmer_id or public.is_admin());

-- ===== notifications =====
drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications for insert
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications for update
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete" on public.notifications for delete
  using (auth.uid() = user_id or public.is_admin());

-- ===== field_visits =====
drop policy if exists "visits_select" on public.field_visits;
create policy "visits_select" on public.field_visits for select
  using (public.is_field_officer() or public.is_admin() or public.is_bank_officer());

drop policy if exists "visits_insert" on public.field_visits;
create policy "visits_insert" on public.field_visits for insert
  with check (public.is_field_officer() or public.is_admin());

drop policy if exists "visits_update" on public.field_visits;
create policy "visits_update" on public.field_visits for update
  using (public.is_field_officer() or public.is_admin());

drop policy if exists "visits_delete" on public.field_visits;
create policy "visits_delete" on public.field_visits for delete
  using (public.is_field_officer() or public.is_admin());

-- ===== audit_logs =====
drop policy if exists "logs_select" on public.audit_logs;
create policy "logs_select" on public.audit_logs for select
  using (public.is_admin());

drop policy if exists "logs_insert" on public.audit_logs;
create policy "logs_insert" on public.audit_logs for insert
  with check (public.is_admin() or public.is_bank_officer() or public.is_field_officer());
```

---

## 4. Storage bucket for photos

In **Storage → New bucket**, create bucket `documents` with **Public** access. Then run in the SQL editor to lock it down:

```sql
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

create policy "anyone can view documents"
on storage.objects for select using (bucket_id = 'documents');

create policy "authenticated can upload documents"
on storage.objects for insert with check (
  bucket_id = 'documents' and auth.role() = 'authenticated'
);
```

Upload URL will be: `https://<project>.supabase.co/storage/v1/object/public/documents/<file>`

---

## 5. Install packages & add env vars

### 5.1 Install in the project root

```bash
npx expo install @supabase/supabase-js
npx expo install react-native-url-polyfill @react-native-async-storage/async-storage
```

### 5.2 Create `.env` (root of project)

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

> Expo automatically inlines any `EXPO_PUBLIC_` prefixed variable. **Never** put the service_role key here.

### 5.3 Create the client

Create `src/lib/supabase.ts`:

```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

> On web (`react-native-web`) AsyncStorage works, but for native builds this also works. If web gives you issues, swap the storage adapter with `localStorage`.

---

## 6. Convert `AuthContext` (real login/logout)

Replace the contents of `src/contexts/AuthContext.tsx` with the version below. **Keep the same `User`, `UserRole` types and the same `login(identifier, password): Promise<User>` signature** so `src/app/view/login.tsx` and `getRouteForRole` keep working unchanged.

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Href } from 'expo-router';
import { supabase } from '@/lib/supabase';

export type UserRole = 'farmer' | 'admin' | 'bank-officer' | 'field-officer';

export type User = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
};

export type AuthState = {
  user: User | null;
  isLoading: boolean;
};

type AuthContextValue = AuthState & {
  isLoggedIn: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string): Promise<User> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, name_en, email, phone')
      .eq('id', userId)
      .single();

    if (error || !data) throw new Error('Profile not found');
    return {
      id: data.id,
      name: data.name_en ?? '',
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
      role: data.role as UserRole,
    };
  }, []);

  // Restore session on app start
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          setUser(await loadProfile(session.user.id));
        } catch {
          setUser(null);
        }
      }
      setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id).then(setUser).catch(() => setUser(null));
      } else {
        setUser(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const login = useCallback(async (identifier: string, password: string): Promise<User> => {
    // email OR phone login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier, // if identifier is a phone, change email: to phone:
      password,
    });
    if (error) throw new Error('Invalid credentials');
    if (!data.user) throw new Error('Invalid credentials');
    const profile = await loadProfile(data.user.id);
    setUser(profile);
    return profile;
  }, [loadProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, isLoggedIn: !!user, login, logout }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getRouteForRole(role: UserRole): Href {
  switch (role) {
    case 'farmer':
      return '/view/FarmerDashboard/farmer-dashboard' as Href;
    case 'admin':
      return '/officials/(admin)' as Href;
    case 'bank-officer':
      return '/officials/(bank-officer)' as Href;
    case 'field-officer':
      return '/officials/(field-officer)' as Href;
  }
}
```

**Phone login:** if you enabled the Phone provider and want `01302228993` to work directly, replace the `signInWithPassword` call with:

```ts
const { data, error } = await supabase.auth.signInWithPassword({
  phone: identifier, // Supabase requires international format: '+8801302228993'
  password,
});
```

### 6.1 Fix provider order in `src/app/_layout.tsx`

The data contexts will need `useAuth()`, so make `AuthProvider` an ancestor of all of them (it currently is inside `NotificationProvider`):

```tsx
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <AppThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <TransactionProvider>
              <LoanProvider>
                <ProfileProvider>
                  <ThemeProvider value={DefaultTheme}>
                    <Slot />
                  </ThemeProvider>
                </ProfileProvider>
              </LoanProvider>
            </TransactionProvider>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </AppThemeProvider>
  );
}
```

---

## 7. Convert `ProfileContext` (load + update profile)

Replace `src/contexts/ProfileContext.tsx` with:

```tsx
import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

// keep the FarmerProfile type EXACTLY as-is (from the current file)
export type FarmerProfile = { /* ...same fields as today... */ };

type ProfileContextType = {
  profile: FarmerProfile | null;
  isLoading: boolean;
  updateProfile: (data: Partial<FarmerProfile>) => Promise<void>;
  resetProfile: () => void;
};

const ProfileContext = createContext<ProfileContextType | null>(null);

// snake_case DB row  ->  camelCase FarmerProfile
function mapRow(row: any): FarmerProfile {
  return {
    nameBn: row.name_bn,
    nameEn: row.name_en,
    nid: row.nid,
    phone: row.phone,
    dob: row.dob,
    gender: row.gender,
    totalLand: row.total_land,
    ownLand: row.own_land,
    leasedLand: row.leased_land,
    selectedCrops: row.selected_crops ?? [],
    location: row.location,
    farmingIncome: row.farming_income,
    otherSources: row.other_sources ?? [],
    otherIncome: row.other_income,
    familyMembers: row.family_members,
    occupation: row.occupation,
    hasLoan: row.has_loan,
    loanAmount: row.loan_amount,
    loanPurpose: row.loan_purpose,
    loanSource: row.loan_source,
    profilePhoto: row.profile_photo_url,
    nidPhoto: row.nid_photo_url,
    landPhoto: row.land_photo_url,
    farmerId: row.farmer_id,
    isVerified: row.is_verified,
    creditScore: row.credit_score,
    memberSince: row.member_since,
    village: row.village,
    union: row.union_,
    upazila: row.upazila,
    district: row.district,
    farmSize: row.farm_size,
    ownership: row.ownership,
    primaryCrop: row.primary_crop,
    secondaryCrop: row.secondary_crop,
    cropDiversity: row.crop_diversity,
    experience: row.experience,
  };
}

// camelCase FarmerProfile  ->  snake_case DB row
function toRow(p: Partial<FarmerProfile>): any {
  return {
    name_bn: p.nameBn,
    name_en: p.nameEn,
    nid: p.nid,
    phone: p.phone,
    dob: p.dob,
    gender: p.gender,
    total_land: p.totalLand,
    own_land: p.ownLand,
    leased_land: p.leasedLand,
    selected_crops: p.selectedCrops,
    location: p.location,
    farming_income: p.farmingIncome,
    other_sources: p.otherSources,
    other_income: p.otherIncome,
    family_members: p.familyMembers,
    occupation: p.occupation,
    has_loan: p.hasLoan,
    loan_amount: p.loanAmount,
    loan_purpose: p.loanPurpose,
    loan_source: p.loanSource,
    profile_photo_url: p.profilePhoto,
    nid_photo_url: p.nidPhoto,
    land_photo_url: p.landPhoto,
    farmer_id: p.farmerId,
    is_verified: p.isVerified,
    credit_score: p.creditScore,
    member_since: p.memberSince,
    village: p.village,
    union_: p.union,
    upazila: p.upazila,
    district: p.district,
    farm_size: p.farmSize,
    ownership: p.ownership,
    primary_crop: p.primaryCrop,
    secondary_crop: p.secondaryCrop,
    crop_diversity: p.cropDiversity,
    experience: p.experience,
  };
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    (async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (!error && data) setProfile(mapRow(data));
      setIsLoading(false);
    })();
  }, [user]);

  const updateProfile = useCallback(async (data: Partial<FarmerProfile>) => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update(toRow(data))
      .eq('id', user.id);
    if (error) throw error;
    setProfile((prev) => (prev ? { ...prev, ...data } : prev));
  }, [user]);

  const resetProfile = useCallback(() => {
    setProfile(null);
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, isLoading, updateProfile, resetProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
```

> ⚠️ Some screens may assume `profile` is non-null (e.g. `profile.tsx`). Wherever you use `useProfile()`, guard with `profile &&` or show a loader while `isLoading`.

---

## 8. Convert `LoanContext`

Replace `src/contexts/LoanContext.tsx`. Keeps `LoanApplication`, `ActiveLoan`, `addApplication`, `applications`, `activeLoans` so the loans screens and approvals screens keep working.

```tsx
import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export type LoanStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'active' | 'completed';
export type TimelineEntry = { label: string; date: string; status: 'done' | 'current' | 'pending' | 'failed' };
export type BankOfficer = { name: string; bank: string; branch: string };

export type LoanApplication = {
  id: string;
  title: string;
  date: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  amount: number;
  duration: string;
  purpose: string;
  installmentType: 'monthly' | 'seasonal';
  emi: number;
  timeline: TimelineEntry[];
  bankOfficer: BankOfficer;
};

export type ActiveLoan = {
  id: string;
  title: string;
  date: string;
  amount: number;
  duration: string;
  interest: string;
  emi: number;
  progress: number;
  installmentsPaid: number;
  installmentsTotal: number;
  nextPaymentDate: string;
  nextPaymentAmount: number;
};

type LoanContextType = {
  applications: LoanApplication[];
  activeLoans: ActiveLoan[];
  loading: boolean;
  addApplication: (app: {
    title: string; amount: number; duration: string;
    purpose: string; installmentType: 'monthly' | 'seasonal';
  }) => Promise<void>;
};

const LoanContext = createContext<LoanContextType | null>(null);

function mapApp(row: any): LoanApplication {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    status: row.status,
    amount: Number(row.amount),
    duration: row.duration,
    purpose: row.purpose,
    installmentType: row.installment_type,
    emi: Number(row.emi),
    timeline: row.timeline ?? [],
    bankOfficer: row.bank_officer ?? { name: '—', bank: '—', branch: '—' },
  };
}

function mapActive(row: any): ActiveLoan {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    amount: Number(row.amount),
    duration: row.duration,
    interest: row.interest,
    emi: Number(row.emi),
    progress: row.progress,
    installmentsPaid: row.installments_paid,
    installmentsTotal: row.installments_total,
    nextPaymentDate: row.next_payment_date,
    nextPaymentAmount: Number(row.next_payment_amount),
  };
}

export function LoanProvider({ children }: { children: ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !user) { setApplications([]); setActiveLoans([]); return; }

    let active = true;
    const isOfficer = user.role === 'admin' || user.role === 'bank-officer' || user.role === 'field-officer';

    (async () => {
      setLoading(true);
      let q = supabase.from('loan_applications').select('*').order('created_at', { ascending: false });
      if (!isOfficer) q = q.eq('farmer_id', user.id);
      const { data: apps } = await q;
      if (!active) return;

      setApplications((apps ?? []).map(mapApp));

      if (!isOfficer) {
        const { data: acts } = await supabase
          .from('active_loans').select('*')
          .eq('farmer_id', user.id);
        if (active) setActiveLoans((acts ?? []).map(mapActive));
      }
      setLoading(false);
    })();

    return () => { active = false; };
  }, [user, isLoggedIn]);

  const addApplication = useCallback(async (app: {
    title: string; amount: number; duration: string;
    purpose: string; installmentType: 'monthly' | 'seasonal';
  }) => {
    if (!user) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const months = parseInt(app.duration, 10);
    const emi = !isNaN(months) && months > 0
      ? Math.round(app.amount * (0.09 / 12) * Math.pow(1 + 0.09 / 12, months) / (Math.pow(1 + 0.09 / 12, months) - 1))
      : 0;
    const id = `L-${now.getFullYear()}-${String(now.getTime()).slice(-5)}`;
    const timeline = [
      { label: 'Application Submitted', date: dateStr, status: 'done' as const },
      { label: 'Field Officer Verified', date: '', status: 'current' as const },
      { label: 'Under Bank Review', date: '', status: 'pending' as const },
      { label: 'Field Visit Scheduled', date: '', status: 'pending' as const },
      { label: 'Loan Decision', date: '', status: 'pending' as const },
      { label: 'Amount Disbursed', date: '', status: 'pending' as const },
    ];

    const { data, error } = await supabase
      .from('loan_applications')
      .insert({
        id, farmer_id: user.id, title: app.title, date: dateStr,
        status: 'pending', amount: app.amount, duration: app.duration,
        purpose: app.purpose, installment_type: app.installmentType, emi,
        timeline, bank_officer: { name: '—', bank: '—', branch: '—' },
      })
      .select()
      .single();

    if (error) throw error;
    if (data) setApplications((prev) => [mapApp(data), ...prev]);
  }, [user]);

  return (
    <LoanContext.Provider value={{ applications, activeLoans, loading, addApplication }}>
      {children}
    </LoanContext.Provider>
  );
}

export function useLoans() {
  const ctx = useContext(LoanContext);
  if (!ctx) throw new Error('useLoans must be used within LoanProvider');
  return ctx;
}
```

### 8.1 Bank officer: approve/reject writes to DB

In `src/features/officials/bank-officer/screens/approvals.tsx`, inside `handleAction`, replace the local `setLocalApps` mutation with a Supabase update (plus a notification + audit log):

```tsx
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { user } = useAuth();

const handleAction = async (id: string, newStatus: 'approved' | 'rejected') => {
  // ...keep the comment validation + Alert confirm...

  const { error } = await supabase
    .from('loan_applications')
    .update({ status: newStatus, review_comment: comment })
    .eq('id', id);
  if (error) return Alert.alert('Error', error.message);

  // notify the farmer
  const app = applications.find((a) => a.id === id);
  if (app) {
    await supabase.from('notifications').insert({
      user_id: app.farmerId /* add farmerId to LoanApplication type */,
      icon: newStatus === 'approved' ? 'checkmark-circle' : 'close-circle',
      color: newStatus === 'approved' ? '#16A34A' : '#DC2626',
      title: newStatus === 'approved' ? 'Loan Approved!' : 'Loan Rejected',
      description: `Your application ${id} was ${newStatus}.`,
      time: 'Just now',
      read: false,
    });
    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      action: `${newStatus} loan application ${id}`,
      module: 'Loan',
      status: 'success',
      time: 'Just now',
    });
  }

  setLocalApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)));
  setCommentId(null);
  setComment('');
};
```

> Add `farmerId: string` to the `LoanApplication` type in the context and set it in `mapApp` (`row.farmer_id`).

---

## 9. Convert `TransactionContext`

Replace `src/contexts/TransactionContext.tsx`:

```tsx
import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export type Transaction = {
  id: string;
  title: string;
  description: string;
  date: string;
  amount: number;
  category: string;
};

type TransactionContextType = {
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
};

const TransactionContext = createContext<TransactionContextType | null>(null);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!isLoggedIn || !user) { setTransactions([]); return; }
    let active = true;
    supabase
      .from('transactions')
      .select('*')
      .eq('farmer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active) setTransactions((data ?? []).map((r: any) => ({
          id: r.id, title: r.title, description: r.description,
          date: r.date, amount: Number(r.amount), category: r.category,
        })));
      });
    return () => { active = false; };
  }, [user, isLoggedIn]);

  const addTransaction = useCallback(async (tx: Omit<Transaction, 'id'>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('transactions')
      .insert({ farmer_id: user.id, ...tx })
      .select()
      .single();
    if (error) throw error;
    if (data) setTransactions((prev) => [{
      id: data.id, title: data.title, description: data.description,
      date: data.date, amount: Number(data.amount), category: data.category,
    }, ...prev]);
  }, [user]);

  const removeTransaction = useCallback(async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <TransactionContext.Provider value={{ transactions, addTransaction, removeTransaction }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionProvider');
  return ctx;
}
```

> The `add-transaction.tsx` screen passes a `Transaction` object without id already, so it works as-is.

---

## 10. Convert `NotificationContext`

Replace `src/contexts/NotificationContext.tsx`:

```tsx
import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export type Notification = {
  id: string;
  icon: string;
  color: string;
  title: string;
  time: string;
  description: string;
  read: boolean;
};

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notif: Omit<Notification, 'id' | 'time' | 'read'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!isLoggedIn || !user) { setNotifications([]); return; }
    let active = true;
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active) setNotifications((data ?? []).map((r: any) => ({
          id: r.id, icon: r.icon, color: r.color, title: r.title,
          time: r.time, description: r.description, read: r.read,
        })));
      });
    return () => { active = false; };
  }, [user, isLoggedIn]);

  const addNotification = useCallback(async (notif: Omit<Notification, 'id' | 'time' | 'read'>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications')
      .insert({ user_id: user.id, time: 'Just now', read: false, ...notif })
      .select()
      .single();
    if (error) throw error;
    if (data) setNotifications((prev) => [{
      id: data.id, icon: data.icon, color: data.color, title: data.title,
      time: data.time, description: data.description, read: data.read,
    }, ...prev]);
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [user]);

  const clearNotifications = useCallback(async () => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    setNotifications([]);
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
```

---

## 11. Fix the 5-step farmer registration (save to DB)

The screens currently lose data between steps. Fix it by holding a **draft** in a context and submitting once on the final screen.

### 11.1 Create `src/contexts/RegistrationContext.tsx`

```tsx
import React, { createContext, useContext, useState, type ReactNode } from 'react';

export type RegistrationDraft = {
  nameBn: string; nameEn: string; nid: string; phone: string; dob: string; gender: string;
  totalLand: string; ownLand: string; leasedLand: string; crops: string[]; location: string;
  farmingIncome: string; otherSources: string[]; otherIncome: string; familyMembers: string;
  hasLoan: boolean | null; loanAmount: string; loanPurpose: string; loanSource: string;
  profilePhoto: string | null; nidPhoto: string | null; landPhoto: string | null;
};

type RegistrationContextType = {
  draft: RegistrationDraft;
  setField: <K extends keyof RegistrationDraft>(key: K, value: RegistrationDraft[K]) => void;
  reset: () => void;
};

const emptyDraft: RegistrationDraft = {
  nameBn: '', nameEn: '', nid: '', phone: '', dob: '', gender: '',
  totalLand: '', ownLand: '', leasedLand: '', crops: [], location: '',
  farmingIncome: '', otherSources: [], otherIncome: '', familyMembers: '',
  hasLoan: null, loanAmount: '', loanPurpose: '', loanSource: '',
  profilePhoto: null, nidPhoto: null, landPhoto: null,
};

const RegistrationContext = createContext<RegistrationContextType | null>(null);

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<RegistrationDraft>(emptyDraft);

  const setField = <K extends keyof RegistrationDraft>(key: K, value: RegistrationDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => setDraft(emptyDraft);

  return (
    <RegistrationContext.Provider value={{ draft, setField, reset }}>
      {children}
    </RegistrationContext.Provider>
  );
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistration must be used within RegistrationProvider');
  return ctx;
}
```

Add `<RegistrationProvider>` in `src/app/_layout.tsx` (inside `AuthProvider`).

### 11.2 Wire each step screen to the draft

In each step screen, replace the local `useState` with the draft. Example for `farmer-registration.tsx`:

```tsx
const { draft, setField } = useRegistration();
// nameBn, nameEn, nid, phone, dob, gender come from draft
// onChangeText: setField('nameBn', value)  etc.
```

Same pattern for `land.tsx` (`totalLand`, `ownLand`, `leasedLand`, `crops`, `location`), `income.tsx` (`farmingIncome`, `otherSources`, `otherIncome`, `familyMembers`), `loan.tsx` (`hasLoan`, `loanAmount`, `loanPurpose`, `loanSource`), and `photo.tsx` (`profilePhoto`, `nidPhoto`, `landPhoto`).

### 11.3 Final submit in `photo.tsx` — create auth user + insert profile + upload photos

In `photo.tsx`, replace `handleSubmit`:

```tsx
import { supabase } from '@/lib/supabase';
import { useRegistration } from '../../../contexts/RegistrationContext';

const { draft, reset } = useRegistration();

async function uploadImage(uri: string, folder: string): Promise<string | null> {
  if (!uri) return null;
  const ext = uri.split('.').pop() ?? 'jpg';
  const name = `${folder}/${Date.now()}.${ext}`;
  const { data: uploaded } = await supabase.storage
    .from('documents')
    .upload(name, {
      uri,
      type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      name,
    });
  if (!uploaded) return null;
  const { data: publicUrl } = supabase.storage.from('documents').getPublicUrl(uploaded.path);
  return publicUrl.publicUrl;
}

const handleSubmit = async () => {
  if (!validate()) return;

  const password = `sofol-${draft.phone}`; // or a value the user sets
  const email = `${draft.phone}@sofol.app`; // or a real email the farmer provides

  // 1) create the auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authError) { Alert.alert('Error', authError.message); return; }
  if (!authData.user) { Alert.alert('Error', 'Could not create account'); return; }

  // 2) upload photos
  const [profileUrl, nidUrl, landUrl] = await Promise.all([
    uploadImage(draft.profilePhoto!, 'profiles'),
    uploadImage(draft.nidPhoto!, 'nids'),
    uploadImage(draft.landPhoto!, 'lands'),
  ]);

  // 3) insert the profile row
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    role: 'farmer',
    status: 'pending',
    name_bn: draft.nameBn,
    name_en: draft.nameEn,
    nid: draft.nid,
    phone: draft.phone,
    email,
    dob: draft.dob,
    gender: draft.gender,
    total_land: Number(draft.totalLand) || 0,
    own_land: Number(draft.ownLand) || 0,
    leased_land: Number(draft.leasedLand) || 0,
    selected_crops: draft.crops,
    location: draft.location,
    farming_income: Number(draft.farmingIncome) || 0,
    other_sources: draft.otherSources,
    other_income: Number(draft.otherIncome) || 0,
    family_members: Number(draft.familyMembers) || 0,
    has_loan: !!draft.hasLoan,
    loan_amount: Number(draft.loanAmount) || 0,
    loan_purpose: draft.loanPurpose,
    loan_source: draft.loanSource,
    profile_photo_url: profileUrl,
    nid_photo_url: nidUrl,
    land_photo_url: landUrl,
    farmer_id: `FAR-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
    is_verified: false,
    credit_score: 0,
    member_since: new Date(),
  });
  if (profileError) { Alert.alert('Error', profileError.message); return; }

  reset();
  router.replace('/view/FarmerDashboard/farmer-dashboard');
};
```

> `expo-image-picker` returns `{ uri, mimeType, fileName }`. Pass `type: draft.profilePhoto?.mimeType` if available. For React Native the upload body must be a **Blob or a `{ uri, type, name }` object** — the `{ uri, type, name }` form above works with `@supabase/supabase-js`.

---

## 12. Convert the officials' screens

### 12.1 Admin Users (`src/features/officials/admin/screens/admin-users.tsx`)

Replace the `initialUsers` import with a query (tabs: Farmers / Field Officers / Bank Officers):

```tsx
import { supabase } from '@/lib/supabase';

const [users, setUsers] = useState<AdminUser[]>([]);

useEffect(() => {
  supabase
    .from('profiles')
    .select('id, name_en, role, district, primary_crop, status')
    .then(({ data }) => {
      setUsers((data ?? []).map((r: any) => ({
        id: r.id, name: r.name_en, role: r.role, location: r.district,
        crop: r.primary_crop, status: r.status,
      })));
    });
}, []);
```

### 12.2 Admin Audit Logs (`audit-logs.tsx`)

```tsx
useEffect(() => {
  supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
    .then(({ data }) => {
      setLogs((data ?? []).map((r: any) => ({
        id: r.id, user: r.user_name, action: r.action, module: r.module,
        time: r.time, status: r.status,
      })));
    });
}, []);
```

### 12.3 Field officer visits (`field-visits.tsx`)

```tsx
useEffect(() => {
  supabase
    .from('field_visits')
    .select('*')
    .order('created_at', { ascending: false })
    .then(({ data }) => {
      setVisits((data ?? []).map((r: any) => ({
        id: r.id, farmerName: r.farmer_name, location: r.location, date: r.date,
        purpose: r.purpose, status: r.status, notes: r.notes,
      })));
    });
}, []);
```

Insert a new visit:

```tsx
await supabase.from('field_visits').insert({
  id: `VIS-${Date.now().toString().slice(-4)}`,
  field_officer_id: user?.id,
  farmer_name: farmerName,
  location, date, purpose,
  status: 'scheduled', notes: '',
});
```

### 12.4 Admin dashboard stats (`admin-dashboard.tsx`)

Replace the hardcoded `heroStats` with real counts:

```tsx
const { data: farmers } = await supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'farmer');
const { data: loans } = await supabase.from('loan_applications').select('id', { count: 'exact' });
const { data: active } = await supabase.from('profiles').select('id', { count: 'exact' }).in('role', ['field-officer', 'bank-officer']);

// heroStats[0].value = String(farmers ?? 0)
// heroStats[1].value = String(loans ?? 0)
// heroStats[3].value = String(active ?? 0)
```

---

## 13. Seed demo data (one-time)

Run this from your machine (not in the app) using the **service_role** key. Create `scripts/seed.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,   // service role, never in the app
);

async function main() {
  const seedUsers = [
    { email: 'admin@gmail.com', password: '123456', name: 'System Administrator', role: 'admin' },
    { email: 'bank@gmail.com', password: '123456', name: 'Ayesha Khatun', role: 'bank-officer' },
    { email: 'field@gmail.com', password: '123456', name: 'Shamim Reza', role: 'field-officer' },
    { email: 'rahim@gmail.com', password: '123456', name: 'Mohammad Rahim', role: 'farmer', phone: '01302228993' },
  ];

  for (const u of seedUsers) {
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: u.email, password: u.password, email_confirm: true,
    });
    if (authErr) { console.error(authErr); continue; }

    await supabase.from('profiles').upsert({
      id: authUser!.user!.id,
      role: u.role,
      status: u.role === 'farmer' ? 'verified' : 'pending',
      name_en: u.name,
      email: u.email,
      phone: u.phone ?? null,
      farmer_id: u.role === 'farmer' ? 'FAR-2024-001' : null,
      is_verified: u.role === 'farmer',
      credit_score: u.role === 'farmer' ? 720 : 0,
      member_since: new Date('2024-01-01'),
    });
  }

  // loan applications for the farmer
  const { data: farmer } = await supabase.from('profiles').select('id').eq('role', 'farmer').single();
  if (farmer) {
    await supabase.from('loan_applications').insert([
      {
        id: 'L-2024-001', farmer_id: farmer.id, title: 'Boro Rice Cultivation',
        date: '15 Jun 2024', status: 'pending', amount: 75000, duration: '6 months',
        purpose: 'Boro Rice Cultivation', installment_type: 'monthly', emi: 12500,
        timeline: [
          { label: 'Application Submitted', date: '15 Jun 2024', status: 'done' },
          { label: 'Field Officer Verified', date: '16 Jun 2024', status: 'done' },
          { label: 'Under Bank Review', date: '17 Jun 2024', status: 'current' },
          { label: 'Field Visit Scheduled', date: '', status: 'pending' },
          { label: 'Loan Decision', date: '', status: 'pending' },
          { label: 'Amount Disbursed', date: '', status: 'pending' },
        ],
        bank_officer: { name: 'Habibur Rahman', bank: 'Sonali Bank', branch: 'Bhola Branch' },
      },
      // ...copy the other two applications from src/data/loans.ts
    ]);

    await supabase.from('active_loans').insert({
      id: 'L-2024-004', farmer_id: farmer.id, title: 'Vegetable Irrigation',
      date: '5 Jun 2024', amount: 60000, duration: '8 months', interest: '8.5%',
      emi: 7500, progress: 25, installments_paid: 2, installments_total: 8,
      next_payment_date: '15 Jul 2024', next_payment_amount: 7500,
    });

    await supabase.from('transactions').insert([
      { farmer_id: farmer.id, title: 'Crop Sales', description: 'Boro rice harvest', date: '18 Jun 2024', amount: 45000, category: 'Income' },
      { farmer_id: farmer.id, title: 'Fertilizer', description: 'Urea + TSP', date: '15 Jun 2024', amount: -8500, category: 'Expense' },
      // ...rest from src/data/transactions.ts
    ]);

    await supabase.from('notifications').insert([
      { user_id: farmer.id, icon: 'checkmark-circle', color: '#16A34A', title: 'Loan Approved!', time: '2h ago', description: 'Your application L-2024-004 for ৳60,000 has been approved by Sonali Bank.', read: false },
      // ...rest from src/data/notifications.ts
    ]);
  }

  await supabase.from('field_visits').insert([
    { id: 'VIS-001', farmer_name: 'Abdul Karim', location: 'Char Fasson', date: '05 Jul 2026', purpose: 'Boro Rice Inspection', status: 'scheduled', notes: 'Check irrigation system and crop health.' },
    // ...rest from src/data/field-officer.ts
  ]);

  await supabase.from('audit_logs').insert([
    { user_name: 'Mohammad Rahim', action: 'Created new farmer profile', module: 'User', status: 'success', time: '2 mins ago' },
    // ...rest from src/data/admin.ts
  ]);

  console.log('Seed complete');
}

main();
```

Run it:

```bash
SUPABASE_URL="https://xxxx.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
npx tsx scripts/seed.ts
```

(Install tsx if needed: `npm i -D tsx`.)

---

## 14. Optional — Real-time updates

So approvals instantly appear on the farmer's phone:

```tsx
useEffect(() => {
  if (!user) return;
  const channel = supabase
    .channel(`loans-${user.id}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'loan_applications', filter: `farmer_id=eq.${user.id}` },
      (payload) => {
        if (payload.eventType === 'INSERT') setApplications((p) => [mapApp(payload.new), ...p]);
        if (payload.eventType === 'UPDATE') {
          setApplications((p) => p.map((a) => (a.id === payload.new.id ? mapApp(payload.new) : a)));
        }
      },
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [user]);
```

Enable in the dashboard: **Database → Replication → enable on `loan_applications`, `notifications`, `field_visits`**.

---

## 15. Final checklist

- [ ] Supabase project created; email (and optionally phone) auth enabled
- [ ] All tables + RLS + storage policies applied (Sections 2–4)
- [ ] `@supabase/supabase-js`, `react-native-url-polyfill`, `@react-native-async-storage/async-storage` installed
- [ ] `.env` with `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `src/lib/supabase.ts` created
- [ ] AuthContext, ProfileContext, LoanContext, TransactionContext, NotificationContext converted
- [ ] `_layout.tsx` provider order fixed; RegistrationProvider added
- [ ] 5-step registration saves to DB (Section 11)
- [ ] Photos upload to `documents` bucket
- [ ] Officials screens query their tables (Section 12)
- [ ] Seed script ran once with service_role key
- [ ] `npm run typecheck` passes (run this — there is a `typecheck` script in package.json)

## Files you'll touch

| Action | File |
|---|---|
| Add | `src/lib/supabase.ts` |
| Add | `src/contexts/RegistrationContext.tsx` |
| Add | `.env` |
| Add | `scripts/seed.ts` |
| Replace | `src/contexts/AuthContext.tsx` |
| Replace | `src/contexts/ProfileContext.tsx` |
| Replace | `src/contexts/LoanContext.tsx` |
| Replace | `src/contexts/TransactionContext.tsx` |
| Replace | `src/contexts/NotificationContext.tsx` |
| Edit | `src/app/_layout.tsx` |
| Edit | 5 files in `src/app/view/FarmerRegistration/` |
| Edit | `src/features/officials/*/screens/*` (queries) |
| Keep (no change) | `src/data/options.ts`, `src/data/settings.ts`, UI components |
