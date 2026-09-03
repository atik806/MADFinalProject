import { supabase, supabaseAdmin } from '../../../config/supabase';
import { recordAuditLog } from '../audit/audit.service';
import { escapeLike, pgrstValue } from '../../../lib/postgrest';

const shortHex = (): string => {
  return Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0')
    .toUpperCase();
};

const normalizePhone = (phone: string): string => {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('880')) return `+${digits}`;
  if (digits.startsWith('0')) return `+88${digits}`;
  return `+880${digits}`;
};

export interface CreateFieldOfficerByAdminInput {
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
}

const findOrphanAuthUser = async (email: string, phone: string) => {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    for (const user of data.users) {
      if (user.email === email || user.phone === phone) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
        if (!profile) return user;
      }
    }
    if ((data.users?.length ?? 0) < 200) return null;
  }
};

// createFieldOfficerByAdmin: the admin creates a fully-fledged field
// officer account. Reuses the same shape as the field-officer self-
// registration but bypasses the registration flow (the admin is already
// authenticated, and the officer is verified immediately).
export const createFieldOfficerByAdmin = async (
  input: CreateFieldOfficerByAdminInput,
  adminContext: { id: string; name: string | null },
) => {
  const {
    nameEn,
    nameBn,
    nid,
    phone,
    password,
    email,
    employeeId,
    designation,
    officeAddress,
    joiningDate,
    supervisedDistrict,
    supervisedUpazila,
    profilePhotoUrl,
  } = input;

  if (!nameEn || !nid || !phone || !password) {
    throw new Error('Missing required fields: nameEn, nid, phone and password are required');
  }

  if (String(password).length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const normalizedPhone = normalizePhone(phone);

  const { data: existing, error: dupError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .or(`nid.eq.${pgrstValue(nid)},phone.eq.${pgrstValue(normalizedPhone)}`)
    .limit(1)
    .maybeSingle();

  if (dupError) {
    throw new Error(dupError.message);
  }
  if (existing) {
    throw new Error('Field officer with this NID or phone is already registered');
  }

  const syntheticEmail = `${nid}@sofol.local`;
  const finalEmail = email?.trim() ? email.trim() : syntheticEmail;

  const createAuthUser = () =>
    supabaseAdmin.auth.admin.createUser({
      phone: normalizedPhone,
      email: finalEmail,
      password,
      phone_confirm: true,
      email_confirm: true,
      user_metadata: { full_name: nameEn, role: 'field_officer' },
    });

  let { data: authData, error: authError } = await createAuthUser();

  if (authError && /already (been )?registered/i.test(authError.message)) {
    const orphan = await findOrphanAuthUser(finalEmail, normalizedPhone);
    if (orphan) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(orphan.id);
      if (!deleteError) {
        ({ data: authData, error: authError } = await createAuthUser());
      }
    }
  }

  if (authError || !authData.user) {
    if (/already (been )?registered/i.test(authError?.message ?? '')) {
      throw new Error('Field officer with this NID or phone is already registered');
    }
    throw new Error(authError?.message ?? 'Failed to create auth user');
  }

  const profileRow = {
    id: authData.user.id,
    role: 'field_officer',
    status: 'active',
    farmer_id: `FO-${shortHex()}`,
    is_verified: true,
    credit_score: 0,
    member_since: new Date().toISOString(),
    name_en: nameEn,
    name_bn: nameBn ?? null,
    nid,
    phone: normalizedPhone,
    email: finalEmail,
    profile_photo_url: profilePhotoUrl ?? null,
    employee_id: employeeId ?? null,
    designation: designation ?? null,
    office_address: officeAddress ?? null,
    joining_date: joiningDate ?? null,
    supervised_district: supervisedDistrict ?? null,
    supervised_upazila: supervisedUpazila ?? null,
  };

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert(profileRow)
    .select()
    .single();

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw new Error(profileError.message);
  }

  void recordAuditLog({
    actorId: adminContext.id,
    actorRole: 'admin',
    actorName: adminContext.name ?? 'Administrator',
    action: 'Created field officer',
    module: 'FieldOfficer',
    targetId: profile.id,
    targetType: 'field_officer',
    status: 'success',
    details: {
      name: nameEn,
      nid,
      phone: normalizedPhone,
      employeeId: employeeId ?? null,
      district: supervisedDistrict ?? null,
    },
  });

  return { user: authData.user, profile };
};

export interface FieldOfficerSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  is_verified: boolean;
  employee_id: string | null;
  designation: string | null;
  supervised_district: string | null;
  supervised_upazila: string | null;
  assigned_farmers: number;
  total_visits: number;
  created_at: string;
}

const withCounts = async (rows: any[]): Promise<FieldOfficerSummary[]> => {
  const out: FieldOfficerSummary[] = [];

  for (const row of rows) {
    const [assignmentsRes, visitsRes] = await Promise.all([
      supabaseAdmin
        .from('field_officer_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('field_officer_id', row.id)
        .eq('status', 'active'),
      supabaseAdmin
        .from('field_visits')
        .select('*', { count: 'exact', head: true })
        .eq('field_officer_id', row.id),
    ]);

    out.push({
      id: row.id,
      name: row.name_en ?? row.name_bn ?? 'Unnamed',
      email: row.email ?? null,
      phone: row.phone ?? null,
      role: row.role ?? 'field_officer',
      status: row.status ?? 'pending',
      is_verified: Boolean(row.is_verified),
      employee_id: row.employee_id ?? null,
      designation: row.designation ?? null,
      supervised_district: row.supervised_district ?? null,
      supervised_upazila: row.supervised_upazila ?? null,
      assigned_farmers: assignmentsRes.count ?? 0,
      total_visits: visitsRes.count ?? 0,
      created_at: row.member_since ?? row.created_at ?? null,
    });
  }

  return out;
};

export interface ListFieldOfficersFilters {
  search?: string;
  status?: string;
  district?: string;
  page?: number;
  pageSize?: number;
}

export const listFieldOfficers = async (filters: ListFieldOfficersFilters) => {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('role', 'field_officer')
    .order('member_since', { ascending: false })
    .range(from, to);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.district) {
    query = query.eq('supervised_district', filters.district);
  }
  if (filters.search) {
    const pattern = pgrstValue(`%${escapeLike(filters.search)}%`);
    query = query.or(
      `name_en.ilike.${pattern},name_bn.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},employee_id.ilike.${pattern},nid.ilike.${pattern}`,
    );
  }

  const { data, count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const items = await withCounts(data ?? []);

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

export const getFieldOfficerById = async (id: string) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'field_officer')
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Field officer not found');
  }

  const [withCount] = await withCounts([data]);

  // Include the list of assigned farmer names (for the detail view).
  const { data: assignments, error: assignError } = await supabaseAdmin
    .from('field_officer_assignments')
    .select('farmer_id, status, assigned_at')
    .eq('field_officer_id', id)
    .order('assigned_at', { ascending: false });
  if (assignError) {
    console.error('Failed to load assignments for FO detail:', assignError);
  }

  let farmers: { id: string; name: string; status: string; assigned_at: string }[] = [];
  if (assignments && assignments.length > 0) {
    const ids = assignments.map((a: any) => a.farmer_id);
    const { data: farmerRows } = await supabaseAdmin
      .from('profiles')
      .select('id, name_en, name_bn')
      .in('id', ids);
    const farmerById = new Map<string, { id: string; name: string }>();
    (farmerRows ?? []).forEach((f: any) => {
      farmerById.set(f.id, { id: f.id, name: f.name_en ?? f.name_bn ?? 'Unnamed' });
    });
    farmers = assignments.map((a: any) => ({
      id: a.farmer_id,
      name: farmerById.get(a.farmer_id)?.name ?? 'Unknown',
      status: a.status,
      assigned_at: a.assigned_at,
    }));
  }

  return { ...withCount, assigned_farmer_list: farmers };
};

// updateFieldOfficer: white-list of editable fields. The admin cannot
// change role, status, is_verified, or farmer_id.
const FIELD_OFFICER_UPDATE_FIELDS = [
  'name_en',
  'name_bn',
  'email',
  'phone',
  'designation',
  'office_address',
  'joining_date',
  'supervised_district',
  'supervised_upazila',
  'employee_id',
  'profile_photo_url',
] as const;

export const updateFieldOfficer = async (
  id: string,
  payload: Record<string, any>,
  adminContext: { id: string; name: string | null },
) => {
  const updates: Record<string, any> = {};
  for (const key of FIELD_OFFICER_UPDATE_FIELDS) {
    if (key in payload) {
      updates[key] = payload[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No updatable fields provided');
  }

  if (typeof updates.phone === 'string' && updates.phone.length > 0) {
    updates.phone = normalizePhone(updates.phone);
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .eq('role', 'field_officer')
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Field officer not found');
  }

  void recordAuditLog({
    actorId: adminContext.id,
    actorRole: 'admin',
    actorName: adminContext.name ?? 'Administrator',
    action: 'Updated field officer',
    module: 'FieldOfficer',
    targetId: id,
    targetType: 'field_officer',
    status: 'success',
    details: { fields: Object.keys(updates) },
  });

  return data;
};

export const setFieldOfficerStatus = async (
  id: string,
  status: 'active' | 'inactive' | 'suspended',
  adminContext: { id: string; name: string | null },
) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ status })
    .eq('id', id)
    .eq('role', 'field_officer')
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Field officer not found');
  }

  void recordAuditLog({
    actorId: adminContext.id,
    actorRole: 'admin',
    actorName: adminContext.name ?? 'Administrator',
    action: `Field officer status set to ${status}`,
    module: 'FieldOfficer',
    targetId: id,
    targetType: 'field_officer',
    status: 'success',
  });

  return data;
};

export const resetFieldOfficerPassword = async (
  id: string,
  newPassword: string,
  adminContext: { id: string; name: string | null },
) => {
  if (!newPassword || String(newPassword).length < 6) {
    throw new Error('New password must be at least 6 characters');
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', id)
    .eq('role', 'field_officer')
    .maybeSingle();
  if (profileError) {
    throw new Error(profileError.message);
  }
  if (!profile) {
    throw new Error('Field officer not found');
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password: newPassword });
  if (error) {
    throw new Error(error.message);
  }

  void recordAuditLog({
    actorId: adminContext.id,
    actorRole: 'admin',
    actorName: adminContext.name ?? 'Administrator',
    action: 'Reset field officer password',
    module: 'FieldOfficer',
    targetId: id,
    targetType: 'field_officer',
    status: 'success',
  });

  return { success: true };
};
