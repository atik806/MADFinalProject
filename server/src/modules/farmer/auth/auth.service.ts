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

// Returns an auth user matching the email/phone only when it has no profile
// row (i.e. it is a leftover from a failed registration, not a real farmer).
const findOrphanAuthUser = async (email: string, phone: string) => {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    for (const user of data.users) {
      if (user.email === email || user.phone === phone) {
        const { data: profile } = await supabase
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
  const { data: existing, error: dupError } = await supabase
    .from('profiles')
    .select('id')
    .or(`nid.eq.${nid},phone.eq.${normalizedPhone}`)
    .limit(1)
    .maybeSingle();

  if (dupError) {
    throw new Error(dupError.message);
  }

  if (existing) {
    throw new Error('Farmer with this NID or phone is already registered');
  }

  const email = `${nid}@sofol.local`;

  const createAuthUser = () =>
    supabase.auth.admin.createUser({
      phone: normalizedPhone,
      email,
      password,
      phone_confirm: true,
      email_confirm: true,
      user_metadata: { full_name: nameEn, role: 'farmer' },
    });

  let { data: authData, error: authError } = await createAuthUser();

  // A previous registration can fail midway and leave an auth user without a
  // profile row. auth.users enforces unique email/phone, so the retry then
  // collides even though the profiles dup-check above passed. Remove the
  // orphan and try once more.
  if (authError && /already (been )?registered/i.test(authError.message)) {
    const orphan = await findOrphanAuthUser(email, normalizedPhone);
    if (orphan) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(orphan.id);
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

  if (!isPhone) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
    });
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  // Phone logins may be disabled on the Supabase project; resolve the
  // registration email (nid@sofol.local) from the profile and sign in with it.
  const normalizedPhone = normalizePhone(identifier);
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('nid')
    .eq('phone', normalizedPhone)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }
  if (!profile?.nid) {
    throw new Error('Invalid login credentials');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${profile.nid}@sofol.local`,
    password,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
};
