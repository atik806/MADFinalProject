import { supabase, createAuthClient } from '../../../config/supabase';

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

// 6-character hex identifier, used to generate a human-readable farmer_id
// at registration. Not security-sensitive — just an opaque short code.
const shortHex = (): string => {
  return Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0')
    .toUpperCase();
};

// Fetches the profile row for an authenticated user. Returns null when the
// profile does not yet exist (e.g. mid-registration or after a self-heal).
export const getProfileById = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

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
    // Privileged/system fields seeded once at registration. They remain
    // non-settable through the farmer-facing PUT /profile endpoint (see
    // PROFILE_FIELD_MAP in profile.service.ts) but must be present in the
    // row so the Profile screen has something to render.
    farmer_id: `FRM-${shortHex()}`,
    is_verified: false,
    credit_score: 0,
    member_since: new Date().toISOString(),
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
    // Address / farm-detail fields. The mobile registration flow doesn't
    // collect them yet, but the Profile screen reads them, so seed with
    // safe defaults so the UI doesn't show "undefined".
    village: null,
    union_: null,
    upazila: null,
    district: null,
    farm_size: toNumber(totalLand),
    ownership: null,
    primary_crop: null,
    secondary_crop: null,
    crop_diversity: null,
    experience: 0,
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
  const rawIdentifier = String(identifier ?? '').trim();
  const isPhone = /^\+?\d[\d\s-]{6,}$/.test(rawIdentifier);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawIdentifier);

  // Isolated client for the sign-in itself — see createAuthClient() docs.
  // Doing this on the shared `supabase` client would leave it authenticated
  // as this farmer, breaking RLS-bypass for every later request.
  const authClient = createAuthClient();

  // Attempts a password sign-in with the given email and returns on success.
  const tryEmailLogin = async (email: string) => {
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error) return null;
    if (!data?.session?.access_token || !data?.user) return null;
    return data;
  };

  // Attempts a password sign-in with the given phone and returns on success.
  const tryPhoneLogin = async (phone: string) => {
    const { data, error } = await authClient.auth.signInWithPassword({ phone, password });
    if (error) return null;
    if (!data?.session?.access_token || !data?.user) return null;
    return data;
  };

  let loginEmail = rawIdentifier;

  // Phone logins may be disabled on the Supabase project; resolve the
  // registration email (nid@sofol.local) from the profile and sign in with it.
  if (isPhone) {
    const normalizedPhone = normalizePhone(rawIdentifier);
    const digits = rawIdentifier.replace(/\D/g, '');
    const localPhone = digits.startsWith('880')
      ? `0${digits.slice(3)}`
      : digits.startsWith('0')
        ? digits
        : `0${digits}`;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('nid, email')
      .in('phone', [normalizedPhone, rawIdentifier, localPhone])
      .limit(1)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    // Primary path for app-created users.
    if (profile?.nid) {
      loginEmail = `${profile.nid}@sofol.local`;
      const bySyntheticEmail = await tryEmailLogin(loginEmail);
      if (bySyntheticEmail) {
        return bySyntheticEmail;
      }
    }

    // Legacy fallback: profile may already store an email.
    if (profile?.email) {
      const byProfileEmail = await tryEmailLogin(profile.email);
      if (byProfileEmail) {
        return byProfileEmail;
      }
    }

    // Last fallback for legacy users created as phone-auth accounts.
    for (const phoneCandidate of [normalizedPhone, localPhone, rawIdentifier]) {
      const byPhone = await tryPhoneLogin(phoneCandidate);
      if (byPhone) {
        return byPhone;
      }
    }

    throw new Error('Invalid login credentials');
  } else if (!isEmail) {
    // Allow login with raw NID by mapping it to the internal registration email.
    loginEmail = `${rawIdentifier}@sofol.local`;
  }

  const byEmail = await tryEmailLogin(loginEmail);
  if (!byEmail) {
    throw new Error('Invalid login credentials');
  }
  return byEmail;
};

// Resolves a farmer's auth-user id (== profiles.id) from a phone number,
// registration email (nid@sofol.local) or raw NID. Returns null if none match.
const resolveFarmerId = async (identifier: string): Promise<string | null> => {
  const value = String(identifier).trim();
  if (value.includes('@')) {
    const nid = value.split('@')[0];
    const { data } = await supabase.from('profiles').select('id').eq('nid', nid).maybeSingle();
    return data?.id ?? null;
  }
  const normalizedPhone = normalizePhone(value);
  const { data: byPhone } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', normalizedPhone)
    .maybeSingle();
  if (byPhone?.id) return byPhone.id;
  const { data: byNid } = await supabase
    .from('profiles')
    .select('id')
    .eq('nid', value)
    .maybeSingle();
  return byNid?.id ?? null;
};

// DEMO password reset: verifies that a farmer account exists for the given
// phone/NID/email, then sets the new password via the Supabase admin API.
// The OTP step in the app is cosmetic — there is no real OTP verification here.
export const resetFarmerPassword = async (identifier: string, newPassword: string) => {
  if (!identifier || !newPassword) {
    throw new Error('Identifier and new password are required');
  }
  if (String(newPassword).length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const userId = await resolveFarmerId(identifier);
  if (!userId) {
    throw new Error('No account found for the provided phone or NID');
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) {
    throw new Error(error.message);
  }
  return { success: true };
};
