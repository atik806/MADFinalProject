import { supabase } from '../../../config/supabase';

export interface RegisterInput {
  nameBn: string;
  nameEn: string;
  nid: string;
  phone: string;
  password: string;
  dob: string;
  gender: string;
  totalLand?: string | number;
  ownLand?: string | number;
  leasedLand?: string | number;
  selectedCrops?: string[];
  location?: string;
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

const toNumber = (value: string | number | undefined): number => {
  if (value === undefined || value === null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toArray = (value: string[] | undefined): string[] => (Array.isArray(value) ? value : []);

const normalizePhone = (phone: string): string => {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('880')) return `+${digits}`;
  if (digits.startsWith('0')) return `+88${digits}`;
  return `+880${digits}`;
};

export const registerFarmer = async (input: RegisterInput) => {
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

  if (!nameBn || !nameEn || !nid || !phone || !password || !dob || !gender) {
    throw new Error('Missing required fields: nameBn, nameEn, nid, phone, password, dob and gender are required');
  }

  const normalizedPhone = normalizePhone(phone);

  // prevent duplicate registration by nid or phone
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .or(`nid.eq.${nid},phone.eq.${normalizedPhone}`)
    .limit(1)
    .maybeSingle();

  if (existing) {
    throw new Error('Farmer with this NID or phone is already registered');
  }

  const email = `${nid}@sofol.local`;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    phone: normalizedPhone,
    password,
    phone_confirm: true,
    user_metadata: { full_name: nameEn, role: 'farmer' },
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? 'Failed to create auth user');
  }

  const profileRow = {
    id: authData.user.id,
    role: 'farmer',
    status: 'pending',
    name_bn: nameBn,
    name_en: nameEn,
    nid,
    phone: normalizedPhone,
    dob,
    gender,
    total_land: toNumber(totalLand),
    own_land: toNumber(ownLand),
    leased_land: toNumber(leasedLand),
    selected_crops: toArray(selectedCrops),
    location: location ?? null,
    farming_income: toNumber(farmingIncome),
    other_income: toNumber(otherIncome),
    family_members: Math.trunc(toNumber(familyMembers)),
    occupation: occupation ?? null,
    other_sources: toArray(otherSources),
    has_loan: Boolean(hasLoan),
    loan_amount: toNumber(loanAmount),
    loan_purpose: loanPurpose ?? null,
    loan_source: loanSource ?? null,
    profile_photo_url: profilePhotoUrl ?? null,
    nid_photo_url: nidPhotoUrl ?? null,
    land_photo_url: landPhotoUrl ?? null,
  };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert(profileRow)
    .select()
    .single();

  if (profileError) {
    // roll back the orphaned auth user so we don't leave dead records
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(profileError.message);
  }

  return { user: authData.user, profile };
};

export const loginFarmer = async (identifier: string, password: string) => {
  const isPhone = /^\+?\d[\d\s-]{6,}$/.test(identifier);
  const credentials = isPhone
    ? { phone: normalizePhone(identifier), password }
    : { email: identifier, password };

  const { data, error } = await supabase.auth.signInWithPassword(credentials as any);
  if (error) {
    throw new Error(error.message);
  }
  return data;
};
