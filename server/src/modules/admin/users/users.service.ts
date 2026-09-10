import { supabase, supabaseAdmin } from '../../../config/supabase';
import { escapeLike, pgrstValue } from '../../../lib/postgrest';
import { recordAuditLog } from '../audit/audit.service';

export type UserRoleFilter = 'farmer' | 'field_officer' | 'bank_officer' | 'admin' | 'all';

export interface AdminUserSummary {
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
  // Role-specific extras
  employee_id?: string | null;
  designation?: string | null;
  supervised_district?: string | null;
  farmer_id?: string | null;
  credit_score?: number;
}

export interface ListUsersFilters {
  role: UserRoleFilter;
  search?: string;
  status?: string;
  district?: string;
  page?: number;
  pageSize?: number;
}

const buildSummary = (row: any): AdminUserSummary => ({
  id: row.id,
  name: row.name_en ?? row.name_bn ?? 'Unnamed',
  email: row.email ?? null,
  phone: row.phone ?? null,
  role: row.role,
  status: row.status ?? 'active',
  is_verified: Boolean(row.is_verified),
  location: row.location ?? null,
  primary_crop: row.primary_crop ?? null,
  member_since: row.member_since ?? null,
  employee_id: row.employee_id ?? null,
  designation: row.designation ?? null,
  supervised_district: row.supervised_district ?? null,
  farmer_id: row.farmer_id ?? null,
  credit_score: row.credit_score ?? 0,
});

export const listUsers = async (filters: ListUsersFilters) => {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('member_since', { ascending: false })
    .range(from, to);

  if (filters.role && filters.role !== 'all') {
    query = query.eq('role', filters.role);
  } else {
    // When 'all', exclude admin users from the default listing so the
    // admin UI doesn't see themselves repeated.
    query = query.neq('role', 'admin');
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.district) {
    query = query.eq('supervised_district', filters.district);
  }
  if (filters.search) {
    const pattern = pgrstValue(`%${escapeLike(filters.search)}%`);
    query = query.or(
      `name_en.ilike.${pattern},name_bn.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},farmer_id.ilike.${pattern},employee_id.ilike.${pattern},nid.ilike.${pattern},location.ilike.${pattern}`,
    );
  }

  const { data, count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const items = (data ?? []).map(buildSummary);
  return {
    items,
    pagination: {
      page,
      pageSize,
      total: count ?? items.length,
      totalPages: Math.max(1, Math.ceil((count ?? items.length) / pageSize)),
    },
  };
};

export const getUserById = async (id: string): Promise<AdminUserSummary> => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('User not found');
  }
  return buildSummary(data);
};

export interface AdminActor {
  id: string;
  name?: string | null;
}

// deleteFarmer: permanently remove a farmer account. Deleting the auth user
// cascades (via `profiles.id references auth.users on delete cascade` and the
// per-table `on delete cascade` on farmer_id) to the profile row plus the
// farmer's loans, transactions, assignments, visits and verifications.
export const deleteFarmer = async (id: string, actor: AdminActor) => {
  const { data: profile, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, name_en, name_bn, phone, farmer_id')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!profile) {
    throw new Error('Farmer not found');
  }
  if (profile.role !== 'farmer') {
    throw new Error('Only farmer accounts can be removed here');
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (authError && !/not found/i.test(authError.message)) {
    throw new Error(authError.message || 'Failed to delete farmer account');
  }

  // Defensive: if the auth user was already gone (orphan profile), the
  // cascade never fired — remove the profile row directly.
  const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', id);
  if (profileError) {
    throw new Error(profileError.message);
  }

  void recordAuditLog({
    actorId: actor.id,
    actorRole: 'admin',
    actorName: actor.name ?? 'Administrator',
    action: 'Removed farmer',
    module: 'User',
    targetId: id,
    targetType: 'farmer',
    status: 'success',
    details: {
      name: profile.name_en ?? profile.name_bn ?? null,
      phone: profile.phone ?? null,
      farmerId: profile.farmer_id ?? null,
    },
  });

  return { id };
};

export interface RoleCounts {
  farmer: number;
  field_officer: number;
  bank_officer: number;
  admin: number;
  total: number;
}

export const getRoleCounts = async (): Promise<RoleCounts> => {
  const safeCount = async (filter: (q: any) => any) => {
    let q = supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true });
    q = filter(q);
    const { count, error } = await q;
    if (error) {
      console.error('getRoleCounts error:', error);
      return 0;
    }
    return count ?? 0;
  };

  const [farmer, field_officer, bank_officer, admin] = await Promise.all([
    safeCount((q) => q.eq('role', 'farmer')),
    safeCount((q) => q.eq('role', 'field_officer')),
    safeCount((q) => q.eq('role', 'bank_officer')),
    safeCount((q) => q.eq('role', 'admin')),
  ]);

  return {
    farmer,
    field_officer,
    bank_officer,
    admin,
    total: farmer + field_officer + bank_officer + admin,
  };
};
