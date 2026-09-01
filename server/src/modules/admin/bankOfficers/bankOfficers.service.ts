import { supabaseAdmin } from '../../../config/supabase';
import { recordAuditLog } from '../audit/audit.service';
import { createOfficerAuthUser, normalizePhone, shortHex } from '../officerAccounts';

// ------------------------------------------------------------------
// Admin → bank officer account provisioning
// ------------------------------------------------------------------
// The bank officer role has no self-registration path: the bank's staff are
// created by an admin, exactly like field officers. This module exists so the
// `bank_officer` role can actually be brought into existence — without it the
// /api/bank-officer surface would be unreachable.

export interface CreateBankOfficerByAdminInput {
  nameEn: string;
  nameBn?: string;
  nid: string;
  phone: string;
  password: string;
  email?: string;
  employeeId?: string;
  designation?: string;
  bankName?: string;
  branchName?: string;
  branchCode?: string;
  joiningDate?: string;
  profilePhotoUrl?: string;
}

export const createBankOfficerByAdmin = async (
  input: CreateBankOfficerByAdminInput,
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
    bankName,
    branchName,
    branchCode,
    joiningDate,
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
    .or(`nid.eq.${nid},phone.eq.${normalizedPhone}`)
    .limit(1)
    .maybeSingle();

  if (dupError) {
    throw new Error(dupError.message);
  }
  if (existing) {
    throw new Error('Bank officer with this NID or phone is already registered');
  }

  const finalEmail = email?.trim() ? email.trim() : `${nid}@sofol.local`;

  const { data: authData, error: authError } = await createOfficerAuthUser({
    email: finalEmail,
    phone: normalizedPhone,
    password,
    fullName: nameEn,
    role: 'bank_officer',
  });

  if (authError || !authData?.user) {
    if (/already (been )?registered/i.test(authError?.message ?? '')) {
      throw new Error('Bank officer with this NID or phone is already registered');
    }
    throw new Error(authError?.message ?? 'Failed to create auth user');
  }

  const profileRow = {
    id: authData.user.id,
    role: 'bank_officer',
    status: 'active',
    farmer_id: `BO-${shortHex()}`,
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
    bank_name: bankName ?? null,
    branch_name: branchName ?? null,
    branch_code: branchCode ?? null,
    joining_date: joiningDate ?? null,
  };

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert(profileRow)
    .select()
    .single();

  // Roll the Auth user back so a failed insert does not leave an account that
  // can log in but has no profile (and therefore no resolvable role).
  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw new Error(profileError.message);
  }

  void recordAuditLog({
    actorId: adminContext.id,
    actorRole: 'admin',
    actorName: adminContext.name ?? 'Administrator',
    action: 'Created bank officer',
    module: 'BankOfficer',
    targetId: profile.id,
    targetType: 'bank_officer',
    status: 'success',
    details: {
      name: nameEn,
      nid,
      phone: normalizedPhone,
      employeeId: employeeId ?? null,
      bankName: bankName ?? null,
      branchName: branchName ?? null,
    },
  });

  return { user: authData.user, profile };
};

export interface ListBankOfficersFilters {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

// listBankOfficers: paginated directory of bank officers, plus how many
// decisions each one has recorded so the admin can see who is actually working
// the queue.
export const listBankOfficers = async (filters: ListBankOfficersFilters) => {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('role', 'bank_officer')
    .order('member_since', { ascending: false })
    .range(from, to);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.search) {
    const term = filters.search.replace(/[%_]/g, '\\$&');
    const pattern = `%${term}%`;
    query = query.or(
      `name_en.ilike.${pattern},name_bn.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},employee_id.ilike.${pattern},nid.ilike.${pattern}`,
    );
  }

  const { data, count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const items = [];
  for (const row of data ?? []) {
    const { count: decisions } = await supabaseAdmin
      .from('loan_applications')
      .select('*', { count: 'exact', head: true })
      .eq('bank_officer_id', row.id);

    items.push({
      id: row.id,
      name: row.name_en ?? row.name_bn ?? 'Unnamed',
      email: row.email ?? null,
      phone: row.phone ?? null,
      role: row.role ?? 'bank_officer',
      status: row.status ?? 'pending',
      is_verified: Boolean(row.is_verified),
      employee_id: row.employee_id ?? null,
      designation: row.designation ?? null,
      bank_name: row.bank_name ?? null,
      branch_name: row.branch_name ?? null,
      branch_code: row.branch_code ?? null,
      handled_applications: decisions ?? 0,
      created_at: row.member_since ?? row.created_at ?? null,
    });
  }

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

// getBankOfficerById: one bank officer's admin-visible profile. Scoped by
// both id AND role so an id belonging to another role is a 404, not a leak.
export const getBankOfficerById = async (id: string) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'bank_officer')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Bank officer not found');
  }

  // Decisions handled by this officer. bank_officer_id is one of the parked
  // bank-officer columns; until admin.sql is applied this query fails with
  // 42703 and the count degrades to 0 — the detail view stays usable.
  let handledApplications = 0;
  try {
    const { count, error: cError } = await supabaseAdmin
      .from('loan_applications')
      .select('*', { count: 'exact', head: true })
      .eq('bank_officer_id', id);
    if (!cError) {
      handledApplications = count ?? 0;
    }
  } catch {
    // column absent — leave at 0
  }

  return {
    ...data,
    handled_applications: handledApplications,
  };
};

export const BANK_OFFICER_STATUSES = ['active', 'inactive', 'suspended'] as const;
export type BankOfficerStatus = (typeof BANK_OFFICER_STATUSES)[number];

// setBankOfficerStatus: the admin's kill switch. A bank officer holds
// loan-approval authority, so the ability to deactivate one has to exist
// independently of deleting the account. bankOfficerOnly re-reads this value on
// every request, so a suspended officer loses access immediately rather than
// when their token expires.
export const setBankOfficerStatus = async (
  id: string,
  status: BankOfficerStatus,
  adminContext: { id: string; name: string | null },
) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ status })
    .eq('id', id)
    .eq('role', 'bank_officer')
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Bank officer not found');
  }

  void recordAuditLog({
    actorId: adminContext.id,
    actorRole: 'admin',
    actorName: adminContext.name ?? 'Administrator',
    action: `Bank officer status set to ${status}`,
    module: 'BankOfficer',
    targetId: id,
    targetType: 'bank_officer',
    status: 'success',
  });

  return data;
};
