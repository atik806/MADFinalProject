import { supabase, supabaseAdmin } from '../../../config/supabase';
import { escapeLike, pgrstValue } from '../../../lib/postgrest';

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
