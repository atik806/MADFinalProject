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
  name: row.name_en ?? 'Unnamed',
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
      `name_en.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},farmer_id.ilike.${pattern},employee_id.ilike.${pattern},nid.ilike.${pattern},location.ilike.${pattern}`,
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
    .select('id, role, name_en, phone, farmer_id')
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
      name: profile.name_en ?? null,
      phone: profile.phone ?? null,
      farmerId: profile.farmer_id ?? null,
    },
  });

  return { id };
};

// autoAssignFieldOfficer: load-balances a newly approved farmer onto
// whichever active field officer currently has the fewest active
// assignments, so the farmer's loan applications are visible to someone.
// A no-op if the farmer already has an assignment (e.g. they were
// registered in person by an officer, which links them immediately) or if
// no field officer is active yet. Assignment is best-effort and must never
// block approval, so every failure is swallowed. Returns the assigned
// officer's id, or null if nothing changed.
const autoAssignFieldOfficer = async (farmerId: string): Promise<string | null> => {
  try {
    const { data: existing } = await supabaseAdmin
      .from('field_officer_assignments')
      .select('id')
      .eq('farmer_id', farmerId)
      .limit(1)
      .maybeSingle();
    if (existing) return null;

    const { data: officers, error: officersError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'field_officer')
      .eq('status', 'active');
    if (officersError || !officers || officers.length === 0) return null;

    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('field_officer_assignments')
      .select('field_officer_id')
      .eq('status', 'active')
      .in(
        'field_officer_id',
        officers.map((o: any) => o.id),
      );
    if (assignmentsError) return null;

    const loadByOfficer = new Map<string, number>(officers.map((o: any) => [o.id, 0]));
    for (const row of assignments ?? []) {
      loadByOfficer.set(row.field_officer_id, (loadByOfficer.get(row.field_officer_id) ?? 0) + 1);
    }

    let chosen: string | null = null;
    let lowest = Infinity;
    for (const officer of officers) {
      const load = loadByOfficer.get(officer.id) ?? 0;
      if (load < lowest) {
        lowest = load;
        chosen = officer.id;
      }
    }
    if (!chosen) return null;

    const { error: insertError } = await supabaseAdmin.from('field_officer_assignments').insert({
      field_officer_id: chosen,
      farmer_id: farmerId,
      status: 'active',
    });
    if (insertError) {
      console.error('autoAssignFieldOfficer insert failed:', insertError);
      return null;
    }
    return chosen;
  } catch (err) {
    console.error('autoAssignFieldOfficer failed:', err);
    return null;
  }
};

// setFarmerVerification: admin approves or declines a pending farmer
// registration. Approving flips is_verified on, sets status 'active' so the
// farmer can sign in, and auto-assigns them to a field officer (see
// autoAssignFieldOfficer) so their loan applications reach someone.
// Declining sets status 'rejected' (is_verified stays false) so a login
// attempt is blocked with a clear message instead of silently succeeding.
// Restricted to role 'farmer' — officer accounts are always created
// pre-verified and never go through this flow.
export const setFarmerVerification = async (
  id: string,
  action: 'approve' | 'reject',
  actor: AdminActor,
): Promise<AdminUserSummary> => {
  const update =
    action === 'approve'
      ? { is_verified: true, status: 'active' }
      : { is_verified: false, status: 'rejected' };

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(update)
    .eq('id', id)
    .eq('role', 'farmer')
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Farmer not found');
  }

  const assignedFieldOfficerId = action === 'approve' ? await autoAssignFieldOfficer(id) : null;

  void recordAuditLog({
    actorId: actor.id,
    actorRole: 'admin',
    actorName: actor.name ?? 'Administrator',
    action: action === 'approve' ? 'Approved farmer registration' : 'Declined farmer registration',
    module: 'User',
    targetId: id,
    targetType: 'farmer',
    status: 'success',
    details: { name: data.name_en ?? null, farmerId: data.farmer_id ?? null, assignedFieldOfficerId },
  });

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
