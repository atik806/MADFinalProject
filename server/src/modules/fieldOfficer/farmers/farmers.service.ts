import { supabase, supabaseAdmin } from '../../../config/supabase';
import { recordAuditLog } from '../../admin/audit/audit.service';
import { isUuid, optionalText, requireText, requireUuid } from '../validation';
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

const toNumber = (value: string | number | undefined, field: string): number => {
  if (value === undefined || value === null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${field} must be a non-negative number`);
  }
  return n;
};

const toArray = (value: unknown, field: string): string[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 50 || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${field} must be an array of up to 50 strings`);
  }
  return value.map((item) => String(item).trim());
};

// assertAssigned: verifies that the given farmer is actively assigned to the
// given field officer. Reused by farmers (get/update) and verification/visits
// so an officer can never touch a farmer they are not authorized for. Throws
// on non-assignment (404) or a DB error.
export const assertAssigned = async (officerId: string, farmerId: string): Promise<void> => {
  if (!isUuid(officerId) || !isUuid(farmerId)) {
    throw new Error('Farmer is not assigned to this field officer');
  }
  const { data, error } = await supabase
    .from('field_officer_assignments')
    .select('id, status')
    .eq('field_officer_id', officerId)
    .eq('farmer_id', farmerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Farmer is not assigned to this field officer');
  }
  if (String(data.status).toLowerCase() !== 'active') {
    throw new Error('Farmer assignment is not active');
  }
};

// fetchAssignedFarmerIdSet: returns the set of farmer ids actively assigned to
// this officer, used to scope list queries. Exported for reuse by the loans
// module so every officer-scoped listing follows one assignment rule.
export const fetchAssignedFarmerIdSet = async (officerId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('field_officer_assignments')
    .select('farmer_id')
    .eq('field_officer_id', officerId)
    .eq('status', 'active');
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row: any) => row.farmer_id);
};

export interface ListFarmersFilters {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export const listAssignedFarmers = async (officerId: string, filters: ListFarmersFilters) => {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const ids = await fetchAssignedFarmerIdSet(officerId);
  if (ids.length === 0) {
    return { items: [], pagination: { page, pageSize, total: 0, totalPages: 1 } };
  }

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .in('id', ids)
    .eq('role', 'farmer')
    .order('member_since', { ascending: false })
    .range(from, to);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.search) {
    const pattern = pgrstValue(`%${escapeLike(filters.search)}%`);
    query = query.or(
      `name_en.ilike.${pattern},name_bn.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},nid.ilike.${pattern},farmer_id.ilike.${pattern}`,
    );
  }

  const { data, count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return {
    items: data ?? [],
    pagination: {
      page,
      pageSize,
      total: count ?? ids.length,
      totalPages: Math.max(1, Math.ceil((count ?? ids.length) / pageSize)),
    },
  };
};

export const getAssignedFarmer = async (officerId: string, farmerId: string) => {
  await assertAssigned(officerId, farmerId);

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', farmerId)
    .eq('role', 'farmer')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Farmer not found');
  }
  return data;
};

// findOrphanAuthUser: locates an auth user (email/phone) that has no profile
// row, i.e. the leftover of a failed prior registration. Used so a duplicate
// retry can be cleaned up and re-attempted safely.
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

export interface RegisterFarmerInput {
  nameBn: string;
  nameEn: string;
  nid: string;
  phone: string;
  password: string;
  dob?: string;
  gender?: string;
  totalLand?: string | number;
  ownLand?: string | number;
  leasedLand?: string | number;
  selectedCrops?: string[];
  location?: string;
  village?: string;
  union?: string;
  upazila?: string;
  district?: string;
  farmingIncome?: string | number;
  otherIncome?: string | number;
  familyMembers?: string | number;
  occupation?: string;
  otherSources?: string[];
  hasLoan?: boolean;
  loanAmount?: string | number;
  loanPurpose?: string;
  loanSource?: string;
  profilePhotoUrl?: string;
  nidPhotoUrl?: string;
  landPhotoUrl?: string;
}

// registerFarmerByOfficer: a field officer registers a brand-new farmer on
// behalf of the farmer. The farmer's auth user + profile row are created with
// role 'farmer' (the officer cannot assign any privileged role), and the
// farmer is immediately linked to the registering officer via an active
// field_officer_assignments row so the officer can manage them. Sensitive
// auth material (password) is never returned.
export const registerFarmerByOfficer = async (input: RegisterFarmerInput, officer: { id: string; name: string | null }) => {
  const {
    nameBn,
    nameEn,
    nid,
    phone,
    password,
    dob,
    gender,
    totalLand,
    ownLand,
    leasedLand,
    selectedCrops,
    location,
    village,
    union,
    upazila,
    district,
    farmingIncome,
    otherIncome,
    familyMembers,
    occupation,
    otherSources,
    hasLoan,
    loanAmount,
    loanPurpose,
    loanSource,
    profilePhotoUrl,
    nidPhotoUrl,
    landPhotoUrl,
  } = input;

  const validNameEn = requireText(nameEn, 'nameEn', 120);
  const validNid = requireText(nid, 'nid', 32);
  if (!/^[0-9A-Za-z-]+$/.test(validNid)) {
    throw new Error('nid contains invalid characters');
  }
  const validPhone = requireText(phone, 'phone', 32);
  const validPassword = requireText(password, 'password', 128);
  if (validPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  if (hasLoan !== undefined && typeof hasLoan !== 'boolean') {
    throw new Error('hasLoan must be a boolean');
  }

  const normalizedPhone = normalizePhone(validPhone);

  // Duplicate guard by NID or phone within profiles.
  const { data: existing, error: dupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('nid', validNid)
    .limit(1)
    .maybeSingle();

  if (dupError) {
    throw new Error(dupError.message);
  }
  if (existing) {
    throw new Error('Farmer with this NID or phone is already registered');
  }

  const { data: existingPhone, error: phoneDupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', normalizedPhone)
    .limit(1)
    .maybeSingle();
  if (phoneDupError) throw new Error(phoneDupError.message);
  if (existingPhone) throw new Error('Farmer with this NID or phone is already registered');

  const syntheticEmail = `${validNid}@sofol.local`;

  const createAuthUser = () =>
    supabaseAdmin.auth.admin.createUser({
      phone: normalizedPhone,
      email: syntheticEmail,
      password: validPassword,
      phone_confirm: true,
      email_confirm: true,
      user_metadata: { full_name: validNameEn, role: 'farmer' },
    });

  let { data: authData, error: authError } = await createAuthUser();

  if (authError && /already (been )?registered/i.test(authError.message)) {
    const orphan = await findOrphanAuthUser(syntheticEmail, normalizedPhone);
    if (orphan) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(orphan.id);
      if (!deleteError) {
        ({ data: authData, error: authError } = await createAuthUser());
      }
    }
  }

  if (authError || !authData.user) {
    if (/already (been )?registered/i.test(authError?.message ?? '')) {
      throw new Error('Farmer with this NID or phone is already registered');
    }
    throw new Error(authError?.message ?? 'Failed to create auth user');
  }

  const profileRow = {
    id: authData.user.id,
    role: 'farmer',
    status: 'pending',
    farmer_id: `FRM-${shortHex()}`,
    is_verified: false,
    credit_score: 0,
    member_since: new Date().toISOString(),
    name_bn: optionalText(nameBn, 'nameBn', 120),
    name_en: validNameEn,
    nid: validNid,
    phone: normalizedPhone,
    email: syntheticEmail,
    dob: optionalText(dob, 'dob', 30),
    gender: optionalText(gender, 'gender', 30),
    total_land: toNumber(totalLand, 'totalLand'),
    own_land: toNumber(ownLand, 'ownLand'),
    leased_land: toNumber(leasedLand, 'leasedLand'),
    selected_crops: toArray(selectedCrops, 'selectedCrops'),
    location: optionalText(location, 'location', 255),
    village: optionalText(village, 'village', 120),
    union_: optionalText(union, 'union', 120),
    upazila: optionalText(upazila, 'upazila', 120),
    district: optionalText(district, 'district', 120),
    farming_income: toNumber(farmingIncome, 'farmingIncome'),
    other_income: toNumber(otherIncome, 'otherIncome'),
    family_members: Math.trunc(toNumber(familyMembers, 'familyMembers')),
    occupation: optionalText(occupation, 'occupation', 120),
    other_sources: toArray(otherSources, 'otherSources'),
    has_loan: hasLoan === undefined ? false : hasLoan,
    loan_amount: toNumber(loanAmount, 'loanAmount'),
    loan_purpose: optionalText(loanPurpose, 'loanPurpose', 255),
    loan_source: optionalText(loanSource, 'loanSource', 120),
    profile_photo_url: optionalText(profilePhotoUrl, 'profilePhotoUrl', 1000),
    nid_photo_url: optionalText(nidPhotoUrl, 'nidPhotoUrl', 1000),
    land_photo_url: optionalText(landPhotoUrl, 'landPhotoUrl', 1000),
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

  // Link the newly created farmer to the registering field officer. If the
  // assignment insert fails (e.g. schema not applied), roll back so we don't
  // leave an unmanaged farmer account behind.
  const { error: assignError } = await supabaseAdmin.from('field_officer_assignments').insert({
    field_officer_id: officer.id,
    farmer_id: profile.id,
    status: 'active',
  });

  if (assignError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    await supabaseAdmin.from('profiles').delete().eq('id', profile.id);
    throw new Error(assignError.message);
  }

  void recordAuditLog({
    actorId: officer.id,
    actorRole: 'field_officer',
    actorName: officer.name ?? 'Field Officer',
    action: 'Registered farmer',
    module: 'FieldOfficer',
    targetId: profile.id,
    targetType: 'farmer',
    status: 'success',
    details: { name: nameEn, nid, phone: normalizedPhone },
  });

  // Never return the password or the full auth user object.
  return { profile };
};

// farmer update: white-list of editable fields a field officer may change for
// an assigned farmer. Privileged fields (role, farmer_id, is_verified,
// credit_score, status, member_since) are NOT settable here — verification
// state is handled exclusively through the verification module.
const FARMER_UPDATE_FIELDS = [
  'name_en',
  'name_bn',
  'nid',
  'phone',
  'email',
  'dob',
  'gender',
  'total_land',
  'own_land',
  'leased_land',
  'selected_crops',
  'location',
  'village',
  'union_',
  'upazila',
  'district',
  'farming_income',
  'other_income',
  'family_members',
  'occupation',
  'other_sources',
  'has_loan',
  'loan_amount',
  'loan_purpose',
  'loan_source',
  'profile_photo_url',
  'nid_photo_url',
  'land_photo_url',
] as const;

export const updateAssignedFarmer = async (
  officerId: string,
  farmerId: string,
  payload: Record<string, any>,
  officer: { id: string; name: string | null },
) => {
  await assertAssigned(officerId, farmerId);

  const updates: Record<string, any> = {};
  for (const key of FARMER_UPDATE_FIELDS) {
    if (key in payload) {
      updates[key] = payload[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No updatable fields provided');
  }

  const numericFields = new Set(['total_land', 'own_land', 'leased_land', 'farming_income', 'other_income', 'family_members', 'loan_amount']);
  const arrayFields = new Set(['selected_crops', 'other_sources']);
  const booleanFields = new Set(['has_loan']);
  const textFields = new Set(['name_en', 'name_bn', 'nid', 'email', 'dob', 'gender', 'location', 'village', 'union_', 'upazila', 'district', 'occupation', 'loan_purpose', 'loan_source', 'profile_photo_url', 'nid_photo_url', 'land_photo_url']);
  for (const [key, value] of Object.entries(updates)) {
    if (numericFields.has(key)) updates[key] = toNumber(value, key);
    if (key === 'family_members' && updates[key] !== undefined) updates[key] = Math.trunc(updates[key]);
    if (arrayFields.has(key)) updates[key] = toArray(value, key);
    if (booleanFields.has(key) && typeof value !== 'boolean') throw new Error(`${key} must be a boolean`);
    if (textFields.has(key)) updates[key] = optionalText(value, key, key.endsWith('_url') ? 1000 : 255);
  }

  if (typeof updates.phone === 'string' && updates.phone.length > 0) {
    updates.phone = normalizePhone(updates.phone);
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', farmerId)
    .eq('role', 'farmer')
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Farmer not found');
  }

  void recordAuditLog({
    actorId: officer.id,
    actorRole: 'field_officer',
    actorName: officer.name ?? 'Field Officer',
    action: 'Updated farmer',
    module: 'FieldOfficer',
    targetId: farmerId,
    targetType: 'farmer',
    status: 'success',
    details: { fields: Object.keys(updates) },
  });

  return data;
};
