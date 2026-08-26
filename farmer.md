# Farmer — Backend API & Frontend Wiring

This file is the single reference for everything related to the **farmer** role:
the Express API in `server/src`, its database contract, the server endpoints that
still need to be added, and the exact code to wire the Expo app
(`src/contexts/*`, `src/lib/*`, registration flow) to it.

The app authenticates with **Supabase** (to obtain a JWT) and then calls the
Express API with `Authorization: Bearer <token>`. The server validates the token
(`supabase.auth.getUser`) and enforces `farmerOnly`, then talks to Supabase with
the **service role** key.

---

## 1. Server review (current state)

Files under `server/src`:

| File | Role | Status |
|---|---|---|
| `config/supabase.ts` | Service-role Supabase client | OK (needs `server/.env`) |
| `middleware/auth.middleware.ts` | Validates bearer token | OK |
| `middleware/role.middleware.ts` | Enforces `profiles.role = 'farmer'` | OK (reads `profiles`) |
| `controllers/farmer.controller.ts` | profile GET/PUT, dashboard | OK (uses `profiles`) |
| `controllers/loan.controller.ts` | loans list/get/apply + timeline | OK |
| `controllers/transaction.controller.ts` | transactions CRUD | OK |
| `controllers/notification.controller.ts` | notifications list/read/delete | OK (uses `req.user.id`) |
| `routes/farmer.routes.ts` | mounts profile/dashboard | OK |
| `routes/loan.routes.ts` | mounts loans | OK (mounted at `/api/farmer/loans`) |
| `routes/transaction.routes.ts` | mounts transactions | OK |
| `routes/notification.router.ts` | mounts notifications | OK |

Schema lives in `server/farmer_db.sql`. The server runs with `npm run dev`
(ts-node-dev) on port `3000`.

**Known gaps that must be closed for a full farmer flow** (see §4):
1. No `POST /api/farmer/register` → a brand-new user cannot create their
   `profiles` row because `farmerOnly` blocks them before `role` exists.
2. No photo-upload endpoint → registration photos have nowhere to go.

---

## 2. Farmer API reference

Base URL: `${EXPO_PUBLIC_API_URL}/api/farmer`. All routes require
`Authorization: Bearer <supabase-access-token>`. `authenticateUser` runs first,
then `farmerOnly` (except the two new routes in §4).

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/profile` → `/api/farmer/profile` | farmer | Get own profile (`profiles` row) |
| PUT | `/profile` | farmer | Upsert own profile |
| GET | `/dashboard` | farmer | Aggregated dashboard data |
| GET | `/loans` | farmer | List own loan applications |
| GET | `/loans/:id` | farmer | Loan + `loan_timeline` |
| POST | `/loans` | farmer | Apply for a loan |
| GET | `/transaction` | farmer | List own transactions |
| GET | `/transaction/:id` | farmer | One transaction |
| POST | `/transaction` | farmer | Create transaction |
| PUT | `/transaction/:id` | farmer | Update transaction |
| DELETE | `/transaction/:id` | farmer | Delete transaction |
| GET | `/notification` | farmer | List own notifications |
| PUT | `/notification/:id/read` | farmer | Mark one read |
| DELETE | `/notification/:id` | farmer | Delete one |
| POST | `/register` *(new)* | user only | Create profile + set `role='farmer'` |
| POST | `/upload` *(new)* | user only | Upload a photo → public URL |

### 2.1 `GET /api/farmer/profile`
Returns the raw `profiles` row (snake_case):
```json
{
  "id":"uuid","role":"farmer","status":"verified","name_bn":"...","name_en":"...",
  "nid":null,"phone":"...","email":null,"dob":null,"gender":null,
  "total_land":0,"own_land":0,"leased_land":0,"selected_crops":[],"location":null,
  "village":null,"union_":null,"upazila":null,"district":null,"farm_size":0,
  "ownership":null,"primary_crop":null,"secondary_crop":null,"crop_diversity":null,
  "experience":0,"farming_income":0,"other_sources":[],"other_income":0,
  "family_members":0,"occupation":null,"has_loan":false,"loan_amount":0,
  "loan_purpose":null,"loan_source":null,"profile_photo_url":null,
  "nid_photo_url":null,"land_photo_url":null,"farmer_id":"FAR-...",
  "is_verified":true,"credit_score":700,"member_since":"2026-08-23",
  "created_at":"...","updated_at":"..."
}
```

### 2.2 `PUT /api/farmer/profile`
Body = any profile fields. Server does `upsert({ id: userId, ...body, updated_at })`.
Returns `{ success, message, data }`.

### 2.3 `GET /api/farmer/dashboard`
```json
{
  "profile": { /* profiles row */ },
  "creditScore": 700,
  "transactions": [ /* up to 5 */ ],
  "loans": [ /* up to 5 */ ],
  "transactionCount": 12,
  "loanCount": 3
}
```

### 2.4 `GET /api/farmer/loans`
`{ "success": true, "message": "...", "data": [ loan_applications rows ] }`

### 2.5 `GET /api/farmer/loans/:id`
`{ "success": true, "data": { ...loan_applications, "loan_timeline": [ {id, loan_application_id, step, label, completed} ] } }`

### 2.6 `POST /api/farmer/loans`
Required body: `title, amount, duration, purpose, installment_type, emi`.
Creates the application (`status:'pending'`, `application_date: now()`), inserts 3
`loan_timeline` rows (Application Submitted / Under Review / Decision), and a
notification. Returns `201 { success, message, data }`.

### 2.7 `POST /api/farmer/transaction`
Required: `title, description, date, amount, category` (`category` ∈ `income|expense`).
Returns `201 { success, message, data }`.

### 2.8 `GET /api/farmer/notification`
`{ "notifications": [ notifications rows ], "success": true }`
(columns: `id, user_id, icon, color, title, description, read, created_at`).

### 2.9 `PUT /api/farmer/notification/:id/read`
Sets `read = true`, returns the row.

---

## 3. Database contract (from `farmer_db.sql`)

Tables: `profiles`, `loan_applications`, `loan_timeline`, `transactions`,
`notifications`, plus the `documents` storage bucket.

Key columns the frontend must map:
- `profiles`: `id` (= auth user id), `role`, `credit_score`, all farmer fields (snake_case).
- `loan_applications`: `id, farmer_id, title, date, status, amount, duration, purpose, installment_type, emi, interest, application_date`.
- `loan_timeline`: `loan_application_id, step, label, completed`.
- `transactions`: `id, farmer_id, title, description, date, amount, category`.
- `notifications`: `id, user_id, icon, color, title, description, read, created_at`.

> **Planned column addition** (for the Loans "Active" tab): add
> `progress, installments_paid, installments_total, next_payment_date,
> next_payment_amount` to `loan_applications` so `status='active'` rows map to the
> app's `ActiveLoan` shape without a separate table.

---

## 4. Server additions required

### 4.1 Restructure `farmer.routes.ts`
Move `farmerOnly` off the router and onto each protected route so the new
`/register` and `/upload` (user-only) work:

```ts
import { Router } from 'express';
import {
  getFarmerDashboard, getFarmerProfile, updateProfile,
  registerFarmer, uploadPhoto,
} from '../controllers/farmer.controller';
import { authenticateUser } from '../middleware/auth.middleware';
import { farmerOnly } from '../middleware/role.middleware';

const router = Router();
router.use(authenticateUser);

router.post('/register', registerFarmer);          // user only
router.post('/upload', uploadPhoto);              // user only

router.get('/profile', farmerOnly, getFarmerProfile);
router.put('/profile', farmerOnly, updateProfile);
router.get('/dashboard', farmerOnly, getFarmerDashboard);

export default router;
```

### 4.2 Add controllers (`farmer.controller.ts`)

```ts
// create profile + set role for a freshly signed-up user
export const registerFarmer = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        role: 'farmer',
        status: 'pending',
        is_verified: false,
        credit_score: 0,
        farmer_id: `FAR-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
        ...req.body,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return res.status(500).json({ message: error.message });
    return res.status(201).json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ message: 'Registration failed' });
  }
};

// base64 upload to the public `documents` bucket
export const uploadPhoto = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const { fileName, contentType, data } = req.body; // data = base64 string
    if (!fileName || !data) return res.status(400).json({ message: 'Missing file' });
    const path = `${req.user.id}/${Date.now()}-${fileName}`;
    const { error } = await supabase.storage
      .from('documents')
      .upload(path, Buffer.from(data, 'base64'), { contentType, upsert: true });
    if (error) return res.status(500).json({ message: error.message });
    const { data: url } = supabase.storage.from('documents').getPublicUrl(path);
    return res.status(201).json({ success: true, url: url.publicUrl });
  } catch (e) {
    return res.status(500).json({ message: 'Upload failed' });
  }
};
```

---

## 5. Frontend wiring

### 5.1 Dependencies & env
```bash
npx expo install @supabase/supabase-js react-native-url-polyfill @react-native-async-storage/async-storage
```
Root `.env` (Expo inlines `EXPO_PUBLIC_*`):
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000   # Android emulator; localhost for web/iOS
```

### 5.2 `src/lib/supabase.ts`
```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } },
);
```

### 5.3 `src/lib/api.ts`
```ts
import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const BASE = `${API_URL}/api/farmer`;

async function headers(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${data.session?.access_token ?? ''}`,
    'Content-Type': 'application/json',
  };
}

export const api = {
  get:  (p: string) => fetch(`${BASE}${p}`, { headers: headers() as any }).then((r) => r.json()),
  post: (p: string, body: any) => fetch(`${BASE}${p}`, { method: 'POST', headers: headers() as any, body: JSON.stringify(body) }).then((r) => r.json()),
  put:  (p: string, body: any) => fetch(`${BASE}${p}`, { method: 'PUT', headers: headers() as any, body: JSON.stringify(body) }).then((r) => r.json()),
  del:  (p: string) => fetch(`${BASE}${p}`, { method: 'DELETE', headers: headers() as any }).then((r) => r.json()),
};
```

### 5.4 `src/app/_layout.tsx` — provider order
`AuthProvider` must wrap the data contexts (they call `useAuth` indirectly via the
API session):
```tsx
<AppThemeProvider>
  <LanguageProvider>
    <AuthProvider>
      <NotificationProvider>
        <TransactionProvider>
          <LoanProvider>
            <ProfileProvider>
              <ThemeProvider value={DefaultTheme}><Slot /></ThemeProvider>
            </ProfileProvider>
          </LoanProvider>
        </TransactionProvider>
      </NotificationProvider>
    </AuthProvider>
  </LanguageProvider>
</AppThemeProvider>
```

### 5.5 `AuthContext` (replace DEMO_USERS logic)
```ts
const login = useCallback(async (identifier: string, password: string): Promise<User> => {
  const email = identifier.includes('@') ? identifier : `${identifier}@sofol.app`;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error('Invalid credentials');
  const { data: prof } = await api.get('/profile');     // has role + name
  return { id: data.user!.id, name: prof.name_en ?? prof.name_bn ?? '', role: prof.role, email, phone: prof.phone ?? undefined };
}, []);
// logout -> supabase.auth.signOut()
// on mount -> supabase.auth.getSession() / onAuthStateChange to restore
```
`getRouteForRole` stays unchanged.

### 5.6 `ProfileContext` (with mapper)
```ts
type ProfileContextType = {
  profile: FarmerProfile | null;
  isLoading: boolean;
  updateProfile: (d: Partial<FarmerProfile>) => Promise<void>;
  resetProfile: () => void;
};

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    (async () => {
      setIsLoading(true);
      const data = await api.get('/profile');
      setProfile(mapProfileRow(data));
      setIsLoading(false);
    })();
  }, [user]);

  const updateProfile = useCallback(async (d: Partial<FarmerProfile>) => {
    if (!user) return;
    const { data } = await api.put('/profile', toProfileRow(d));
    setProfile(mapProfileRow(data));
  }, [user]);

  return <ProfileContext.Provider value={{ profile, isLoading, updateProfile, resetProfile }}>{children}</ProfileContext.Provider>;
}
```

Mapper (`src/lib/mappers.ts` or inline):
```ts
export function mapProfileRow(r: any): FarmerProfile {
  return {
    nameBn: r.name_bn, nameEn: r.name_en, nid: r.nid, phone: r.phone, dob: r.dob, gender: r.gender,
    totalLand: Number(r.total_land), ownLand: Number(r.own_land), leasedLand: Number(r.leased_land),
    selectedCrops: r.selected_crops ?? [], location: r.location,
    farmingIncome: Number(r.farming_income), otherSources: r.other_sources ?? [], otherIncome: Number(r.other_income),
    familyMembers: Number(r.family_members), occupation: r.occupation,
    hasLoan: !!r.has_loan, loanAmount: Number(r.loan_amount), loanPurpose: r.loan_purpose, loanSource: r.loan_source,
    profilePhoto: r.profile_photo_url, nidPhoto: r.nid_photo_url, landPhoto: r.land_photo_url,
    farmerId: r.farmer_id, isVerified: !!r.is_verified, creditScore: Number(r.credit_score), memberSince: r.member_since,
    village: r.village, union: r.union_, upazila: r.upazila, district: r.district,
    farmSize: Number(r.farm_size), ownership: r.ownership, primaryCrop: r.primary_crop,
    secondaryCrop: r.secondary_crop, cropDiversity: r.crop_diversity, experience: Number(r.experience),
  };
}
export function toProfileRow(p: Partial<FarmerProfile>): any {
  return {
    name_bn: p.nameBn, name_en: p.nameEn, nid: p.nid, phone: p.phone, dob: p.dob, gender: p.gender,
    total_land: p.totalLand, own_land: p.ownLand, leased_land: p.leasedLand, selected_crops: p.selectedCrops, location: p.location,
    farming_income: p.farmingIncome, other_sources: p.otherSources, other_income: p.otherIncome, family_members: p.familyMembers, occupation: p.occupation,
    has_loan: p.hasLoan, loan_amount: p.loanAmount, loan_purpose: p.loanPurpose, loan_source: p.loanSource,
    profile_photo_url: p.profilePhoto, nid_photo_url: p.nidPhoto, land_photo_url: p.landPhoto,
    village: p.village, union_: p.union, upazila: p.upazila, district: p.district,
    farm_size: p.farmSize, ownership: p.ownership, primary_crop: p.primaryCrop,
    secondary_crop: p.secondaryCrop, crop_diversity: p.cropDiversity, experience: p.experience,
  };
}
```

### 5.7 `LoanContext`
```ts
useEffect(() => {
  if (!user) { setApplications([]); setActiveLoans([]); return; }
  (async () => {
    setLoading(true);
    const res = await api.get('/loans');                 // { data: [...] }
    const rows: any[] = res.data ?? [];
    setApplications(rows.map(mapLoanApplication));
    setActiveLoans(rows.filter(r => r.status === 'active').map(mapActiveLoan));
    setLoading(false);
  })();
}, [user]);

const addApplication = useCallback(async (app) => {
  if (!user) return;
  const { data } = await api.post('/loans', app);
  setApplications((prev) => [mapLoanApplication(data), ...prev]);
}, [user]);
```
Mappers:
```ts
export function mapLoanApplication(r: any): LoanApplication {
  return {
    id: r.id, title: r.title, date: r.application_date ?? r.date, status: r.status,
    amount: Number(r.amount), duration: r.duration, purpose: r.purpose,
    installmentType: r.installment_type, emi: Number(r.emi),
    timeline: (r.loan_timeline ?? []).map((t: any) => ({
      label: t.label, date: '', status: t.completed ? 'done' : 'pending',
    })),
    bankOfficer: { name: '—', bank: '—', branch: '—' },
  };
}
export function mapActiveLoan(r: any): ActiveLoan {
  return {
    id: r.id, title: r.title, date: r.application_date ?? r.date, amount: Number(r.amount),
    duration: r.duration, interest: r.interest, emi: Number(r.emi),
    progress: Number(r.progress ?? 0), installmentsPaid: Number(r.installments_paid ?? 0),
    installmentsTotal: Number(r.installments_total ?? 0),
    nextPaymentDate: r.next_payment_date, nextPaymentAmount: Number(r.next_payment_amount ?? 0),
  };
}
```
> Extend the app `LoanStatus` union to include `'active' | 'completed'`.

### 5.8 `TransactionContext`
```ts
useEffect(() => { if (!user) { setTransactions([]); return; }
  api.get('/transaction').then(r => setTransactions((r.data ?? []).map(mapTransaction))); }, [user]);

const addTransaction = (tx) => api.post('/transaction', tx).then(r => setTransactions(p => [mapTransaction(r.data), ...p]));
const removeTransaction = (id) => api.del(`/transaction/${id}`).then(() => setTransactions(p => p.filter(t => t.id !== id)));
```
```ts
export const mapTransaction = (r: any): Transaction => ({
  id: r.id, title: r.title, description: r.description, date: r.date, amount: Number(r.amount), category: r.category,
});
```

### 5.9 `NotificationContext`
```ts
useEffect(() => { if (!user) { setNotifications([]); return; }
  api.get('/notification').then(r => setNotifications((r.notifications ?? []).map(mapNotification))); }, [user]);

const markAsRead = (id) => api.put(`/notification/${id}/read`, {}).then(r => setNotifications(p => p.map(n => n.id===id?{...n,read:true}:n)));
```
```ts
export const mapNotification = (r: any): Notification => ({
  id: r.id, icon: r.icon, color: r.color, title: r.title, description: r.description,
  time: r.created_at, read: !!r.read,
});
```

### 5.10 Registration flow
1. **`src/contexts/RegistrationContext.tsx`** — holds the 5-step draft
   (`nameBn, nameEn, nid, phone, dob, gender, totalLand, ownLand, leasedLand,
   crops[], location, farmingIncome, otherSources[], otherIncome, familyMembers,
   hasLoan, loanAmount, loanPurpose, loanSource, profilePhoto, nidPhoto,
   landPhoto`). Each step screen reads/writes the draft instead of local
   `useState`.
2. **`photo.tsx` final submit:**
   ```ts
   const { data, error } = await supabase.auth.signUp({ email, password }); // disable "Confirm email" in Supabase for demo
   if (error) throw error;
   const session = data.session ?? (await supabase.auth.signInWithPassword({ email, password })).data.session;
   // upload photos
   const toB64 = async (uri: string) => { /* read file -> base64 */ };
   const [p,n,l] = await Promise.all([profilePhoto,nidPhoto,landPhoto].map(async (uri) => {
     if (!uri) return null;
     const b64 = await toB64(uri);
     const { url } = await api.post('/upload', { fileName: uri.split('/').pop(), contentType: 'image/jpeg', data: b64 });
     return url;
   }));
   await api.post('/register', { ...toProfileRow(draft), profile_photo_url: p, nid_photo_url: n, land_photo_url: l });
   router.replace('/view/FarmerDashboard/farmer-dashboard');
   ```

---

## 6. Seed demo farmer
Re-add `server/scripts/seed.ts` (service-role) that creates a Supabase Auth user
+ a `profiles` row with `role='farmer'` (same approach as the earlier test
script). Use it so `login.tsx` works with known credentials.

## 7. Verify
1. `cd server && npm run dev` → `GET /` returns `Sofol api is running`.
2. App: log in as the seeded farmer → dashboard/profile/loans/transactions/notifications
   load from the API (check network tab / server log).
3. Edit profile → persists (PUT /profile); add transaction → appears; apply loan →
   appears in list + notification created.
4. Register a new farmer end-to-end → photos uploaded, profile row created,
   redirected to dashboard.
```
