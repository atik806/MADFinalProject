import { api } from '@/config/api';

// Shared types for the admin module. Keep them aligned with the
// `AdminUserSummary` / `FieldOfficerSummary` shapes returned by
// `server/src/modules/admin/users/users.service.ts` and
// `.../fieldOfficers/fieldOfficers.service.ts`.

export type AdminUserRole = 'farmer' | 'field_officer' | 'bank_officer' | 'admin' | 'all';

export type AdminUserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export type AdminUserItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  is_verified: boolean;
  location: string | null;
  primary_crop: string | null;
  member_since: string | null;
  employee_id?: string | null;
  designation?: string | null;
  supervised_district?: string | null;
  farmer_id?: string | null;
  credit_score?: number;
};

export type AdminListResponse = {
  success: boolean;
  message?: string;
  data: {
    items: AdminUserItem[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
};

export type RoleCounts = {
  farmer: number;
  field_officer: number;
  bank_officer: number;
  admin: number;
  total: number;
};

export type CreateFieldOfficerPayload = {
  nameEn: string;
  nameBn?: string;
  nid: string;
  phone: string;
  password: string;
  email?: string;
  employeeId?: string;
  designation?: string;
  officeAddress?: string;
  joiningDate?: string;
  supervisedDistrict?: string;
  supervisedUpazila?: string;
  profilePhotoUrl?: string;
};

export type FieldOfficerItem = AdminUserItem & {
  assigned_farmers: number;
  total_visits: number;
  created_at: string | null;
  assigned_farmer_list?: { id: string; name: string; status: string; assigned_at: string }[];
};

export type FieldOfficerListResponse = {
  success: boolean;
  message?: string;
  data: {
    items: FieldOfficerItem[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
};

export type DashboardStats = {
  totalFarmers: number;
  verifiedFarmers: number;
  pendingFarmers: number;
  totalFieldOfficers: number;
  activeFieldOfficers: number;
  totalLoans: number;
  pendingLoans: number;
  approvedLoans: number;
  rejectedLoans: number;
  forwardedLoans: number;
  totalAssignments: number;
  totalVisits: number;
  visitsToday: number;
  pendingVerifications: number;
  recentFarmers: number;
  recentFieldOfficers: number;
  generatedAt: string;
};

// Users
export async function fetchUsers(opts: {
  role?: AdminUserRole;
  search?: string;
  status?: string;
  district?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<AdminListResponse> {
  const params: Record<string, string> = {};
  if (opts.role) params.role = opts.role;
  if (opts.search) params.search = opts.search;
  if (opts.status) params.status = opts.status;
  if (opts.district) params.district = opts.district;
  if (opts.page) params.page = String(opts.page);
  if (opts.pageSize) params.pageSize = String(opts.pageSize);
  const qs = new URLSearchParams(params).toString();
  return api.get<AdminListResponse>(`/api/admin/users${qs ? `?${qs}` : ''}`);
}

export async function fetchRoleCounts(): Promise<{ success: boolean; data: RoleCounts }> {
  return api.get<{ success: boolean; data: RoleCounts }>(`/api/admin/users/counts`);
}

// Field officers
export async function fetchFieldOfficers(opts: {
  search?: string;
  status?: string;
  district?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<FieldOfficerListResponse> {
  const params: Record<string, string> = {};
  if (opts.search) params.search = opts.search;
  if (opts.status) params.status = opts.status;
  if (opts.district) params.district = opts.district;
  if (opts.page) params.page = String(opts.page);
  if (opts.pageSize) params.pageSize = String(opts.pageSize);
  const qs = new URLSearchParams(params).toString();
  return api.get<FieldOfficerListResponse>(`/api/admin/field-officers${qs ? `?${qs}` : ''}`);
}

export type CreateFieldOfficerResponse = {
  success: boolean;
  message: string;
  data: {
    user: { id: string; email: string | null; phone: string | null };
    profile: AdminUserItem;
  };
};

export async function createFieldOfficer(
  payload: CreateFieldOfficerPayload,
): Promise<CreateFieldOfficerResponse> {
  return api.post<CreateFieldOfficerResponse>(`/api/admin/field-officers`, payload);
}

export type FieldOfficerStatus = 'active' | 'inactive' | 'suspended';

export async function setFieldOfficerStatus(
  id: string,
  status: FieldOfficerStatus,
): Promise<{ success: boolean; message: string; data: AdminUserItem }> {
  return api.patch<{ success: boolean; message: string; data: AdminUserItem }>(
    `/api/admin/field-officers/${id}/status`,
    { status },
  );
}

export async function resetFieldOfficerPassword(
  id: string,
  newPassword: string,
): Promise<{ success: boolean; message: string }> {
  return api.post<{ success: boolean; message: string }>(
    `/api/admin/field-officers/${id}/reset-password`,
    { newPassword },
  );
}

// Dashboard
export async function fetchDashboardStats(): Promise<{ success: boolean; data: DashboardStats }> {
  return api.get<{ success: boolean; data: DashboardStats }>(`/api/admin/dashboard/stats`);
}

export type RecentActivityItem = {
  id: string;
  actorName: string;
  action: string;
  module: string;
  status: string;
  createdAt: string;
};

export async function fetchRecentActivity(limit: number = 10) {
  return api.get<{ success: boolean; data: RecentActivityItem[] }>(
    `/api/admin/dashboard/recent-activity?limit=${limit}`,
  );
}

export type RegistrationTrendPoint = { label: string; value: number };
export type LoanAnalyticsPoint = { label: string; approved: number; pending: number };

export type AdminOverview = {
  stats: DashboardStats;
  registrationTrend: RegistrationTrendPoint[];
  loanAnalytics: LoanAnalyticsPoint[];
  recentActivity: RecentActivityItem[];
};

// One round-trip for everything the dashboard needs.
export async function fetchAdminOverview(): Promise<{ success: boolean; data: AdminOverview }> {
  return api.get<{ success: boolean; data: AdminOverview }>(`/api/admin/dashboard/overview`);
}

// Field officer update (white-listed fields, see fieldOfficers.service.ts).
export type UpdateFieldOfficerPayload = Partial<{
  nameEn: string;
  nameBn: string;
  email: string;
  phone: string;
  designation: string;
  officeAddress: string;
  joiningDate: string;
  supervisedDistrict: string;
  supervisedUpazila: string;
  employeeId: string;
  profilePhotoUrl: string;
}>;

// The server white-list uses snake_case profile columns; map the friendly
// payload keys onto them.
export async function updateFieldOfficer(
  id: string,
  payload: UpdateFieldOfficerPayload,
): Promise<{ success: boolean; message: string; data: AdminUserItem }> {
  const body: Record<string, unknown> = {};
  const map: Record<keyof UpdateFieldOfficerPayload, string> = {
    nameEn: 'name_en',
    nameBn: 'name_bn',
    email: 'email',
    phone: 'phone',
    designation: 'designation',
    officeAddress: 'office_address',
    joiningDate: 'joining_date',
    supervisedDistrict: 'supervised_district',
    supervisedUpazila: 'supervised_upazila',
    employeeId: 'employee_id',
    profilePhotoUrl: 'profile_photo_url',
  };
  (Object.keys(payload) as (keyof UpdateFieldOfficerPayload)[]).forEach((k) => {
    if (payload[k] !== undefined) body[map[k]] = payload[k];
  });
  return api.put<{ success: boolean; message: string; data: AdminUserItem }>(
    `/api/admin/field-officers/${id}`,
    body,
  );
}

// Loans (read-only admin view).
export type AdminLoanItem = {
  id: string;
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string | null;
  amount: number;
  purpose: string | null;
  status: string;
  verification_status: string;
  forwarded_at: string | null;
  recommended_amount: number;
  field_officer_id: string | null;
  field_officer_name: string | null;
  created_at: string;
};

export async function fetchLoans(opts: {
  search?: string;
  status?: string;
  verificationStatus?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{
  success: boolean;
  data: { items: AdminLoanItem[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
}> {
  const params: Record<string, string> = {};
  if (opts.search) params.search = opts.search;
  if (opts.status) params.status = opts.status;
  if (opts.verificationStatus) params.verificationStatus = opts.verificationStatus;
  if (opts.page) params.page = String(opts.page);
  if (opts.pageSize) params.pageSize = String(opts.pageSize);
  const qs = new URLSearchParams(params).toString();
  return api.get(`/api/admin/loans${qs ? `?${qs}` : ''}`);
}

// Audit logs.
export type AuditLogItem = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  actor_name: string | null;
  action: string;
  module: string;
  target_id: string | null;
  target_type: string | null;
  status: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type AuditLogModule = 'All' | 'Auth' | 'User' | 'Loan' | 'FieldOfficer' | 'Report' | 'System';

export async function fetchAuditLogs(opts: {
  module?: AuditLogModule;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{
  success: boolean;
  data: {
    items: AuditLogItem[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  };
}> {
  const params: Record<string, string> = {};
  if (opts.module && opts.module !== 'All') params.module = opts.module;
  if (opts.status) params.status = opts.status;
  if (opts.search) params.search = opts.search;
  if (opts.page) params.page = String(opts.page);
  if (opts.pageSize) params.pageSize = String(opts.pageSize);
  const qs = new URLSearchParams(params).toString();
  return api.get(`/api/admin/audit/logs${qs ? `?${qs}` : ''}`);
}

// Admin account.
export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; message: string }> {
  return api.post(`/api/admin/auth/change-password`, { currentPassword, newPassword });
}
