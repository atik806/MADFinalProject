// Centralized API response contracts for the SOFOL backend.
//
// Every backend endpoint answers with one of two envelopes:
//   - the shared contract:  { success, message, data }
//   - the legacy notifications controller: { notifications, success }
// These types describe those envelopes and the row shapes the server
// actually returns (snake_case DB columns). Contexts/screens import them
// instead of re-declaring `any` per call site.

// ---------------------------------------------------------------------------
// Shared envelopes
// ---------------------------------------------------------------------------

export type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export type ListResult<T> = {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type NotificationsEnvelope = {
  notifications?: NotificationRow[];
  success?: boolean;
};

// ---------------------------------------------------------------------------
// Auth (POST /api/farmer/auth/login, /api/admin/auth/login)
// ---------------------------------------------------------------------------

export type LoginResponse = {
  success?: boolean;
  message?: string;
  token?: string;
  user?: {
    id: string;
    email?: string | null;
    phone?: string | null;
    user_metadata?: { full_name?: string | null };
  };
  profile?: ProfileRow | OfficerProfileRow | BankOfficerProfileRow | null;
};

// ---------------------------------------------------------------------------
// Profiles (farmers GET/PUT /api/farmer/me, GET/PUT /api/farmer/profile)
// ---------------------------------------------------------------------------

export type ProfileRow = {
  id: string;
  role?: string;
  status?: string;
  name_en?: string | null;
  name_bn?: string | null;
  nid?: string | null;
  phone?: string | null;
  email?: string | null;
  dob?: string | null;
  gender?: string | null;
  total_land?: number | null;
  own_land?: number | null;
  leased_land?: number | null;
  selected_crops?: string[] | null;
  location?: string | null;
  village?: string | null;
  union_?: string | null;
  upazila?: string | null;
  district?: string | null;
  farm_size?: number | null;
  ownership?: string | null;
  primary_crop?: string | null;
  secondary_crop?: string | null;
  crop_diversity?: string | null;
  experience?: number | null;
  farming_income?: number | null;
  other_sources?: string[] | null;
  other_income?: number | null;
  family_members?: number | null;
  occupation?: string | null;
  has_loan?: boolean | null;
  loan_amount?: number | null;
  loan_purpose?: string | null;
  loan_source?: string | null;
  profile_photo_url?: string | null;
  nid_photo_url?: string | null;
  land_photo_url?: string | null;
  farmer_id?: string | null;
  is_verified?: boolean | null;
  credit_score?: number | null;
  member_since?: string | null;
};

// GET /api/farmer/auth/me — legacy shape: { data: authUser, profile }
export type AuthMeResponse = {
  success?: boolean;
  message?: string;
  data?: { id: string; email?: string | null; phone?: string | null };
  profile?: ProfileRow;
};

// ---------------------------------------------------------------------------
// Transactions (farmer)
// ---------------------------------------------------------------------------

export type TransactionRow = {
  id: string;
  farmer_id?: string;
  title: string;
  description?: string | null;
  date: string;
  amount: number;
  category: 'income' | 'expense';
  created_at?: string;
};

export type TransactionInput = {
  title: string;
  description?: string;
  date: string;
  amount: number;
  category: 'income' | 'expense';
};

// ---------------------------------------------------------------------------
// Loans (farmer + field officer)
// ---------------------------------------------------------------------------

export type LoanTimelineStep = {
  id?: string;
  loan_application_id?: string;
  step: number;
  label?: string;
  completed: boolean;
  completed_at?: string | null;
};

export type LoanRow = {
  id: string;
  farmer_id?: string;
  field_officer_id?: string | null;
  title: string;
  amount: number;
  duration?: string | null;
  purpose?: string | null;
  installment_type?: string | null;
  emi?: number | null;
  interest?: number | null;
  status?: string;
  verification_status?: string;
  application_date?: string | null;
  created_at?: string;
  verified_at?: string | null;
  reviewed_at?: string | null;
  forwarded_at?: string | null;
  decision_at?: string | null;
  loan_timeline?: LoanTimelineStep[];
  // Embedded by the field-officer loans endpoints only.
  farmer?: { id: string; name_en?: string | null; name_bn?: string | null } | null;
};

export type LoanApplicationInput = {
  title: string;
  amount: number;
  duration: string;
  purpose: string;
  installmentType: 'monthly' | 'seasonal';
  emi?: number;
  interest?: number;
};

// ---------------------------------------------------------------------------
// Notifications (farmer)
// ---------------------------------------------------------------------------

export type NotificationRow = {
  id: string;
  user_id?: string;
  title: string;
  description?: string | null;
  read?: boolean;
  created_at?: string;
};

// ---------------------------------------------------------------------------
// Field Officer
// ---------------------------------------------------------------------------

export type OfficerProfileRow = {
  id: string;
  role?: string;
  status?: string;
  name_en?: string | null;
  name_bn?: string | null;
  phone?: string | null;
  email?: string | null;
  designation?: string | null;
  employee_id?: string | null;
  supervised_district?: string | null;
  supervised_upazila?: string | null;
};

export type BankOfficerProfileRow = {
  id: string;
  role?: string;
  status?: string;
  name_en?: string | null;
  name_bn?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type FieldVisitRow = {
  id: string;
  field_officer_id?: string;
  farmer_id?: string | null;
  visit_date?: string | null;
  created_at?: string;
  purpose?: string | null;
  notes?: string | null;
  location?: string | null;
  visit_type?: string | null;
  status?: string;
};

export type VisitInput = {
  farmerId: string;
  visitDate?: string;
  purpose?: string;
  notes?: string;
  location?: string;
  visitType?: string;
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export type AdminStatsRow = {
  totalFarmers?: number;
  verifiedFarmers?: number;
  pendingFarmers?: number;
  totalFieldOfficers?: number;
  activeFieldOfficers?: number;
  totalBankOfficers?: number;
  activeBankOfficers?: number;
  totalLoans?: number;
  pendingLoans?: number;
  approvedLoans?: number;
  rejectedLoans?: number;
  pendingVerifications?: number;
};

export type TrendPoint = { label: string; value: number };
export type LoanAnalyticsPoint = { label: string; approved: number; pending: number };

export type AdminDirectoryRow = {
  id: string;
  role?: string;
  status?: string;
  name_en?: string | null;
  name_bn?: string | null;
  email?: string | null;
  phone?: string | null;
  district?: string | null;
  village?: string | null;
  is_verified?: boolean | null;
  credit_score?: number | null;
  farmer_id?: string | null;
  employee_id?: string | null;
  designation?: string | null;
  member_since?: string | null;
  created_at?: string | null;
};

export type AuditLogRow = {
  id: string;
  actor_name?: string | null;
  actor_role?: string | null;
  action?: string | null;
  module?: string | null;
  target_id?: string | null;
  status?: string | null;
  created_at?: string;
};
