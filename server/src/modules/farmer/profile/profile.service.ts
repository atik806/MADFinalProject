import { supabase } from '../../../config/supabase';

// Maps the app's camelCase profile fields to the DB snake_case columns.
export const PROFILE_FIELD_MAP: Record<string, string> = {
  nameBn: 'name_bn',
  nameEn: 'name_en',
  nid: 'nid',
  phone: 'phone',
  email: 'email',
  dob: 'dob',
  gender: 'gender',
  totalLand: 'total_land',
  ownLand: 'own_land',
  leasedLand: 'leased_land',
  selectedCrops: 'selected_crops',
  location: 'location',
  village: 'village',
  union: 'union_',
  upazila: 'upazila',
  district: 'district',
  farmSize: 'farm_size',
  ownership: 'ownership',
  primaryCrop: 'primary_crop',
  secondaryCrop: 'secondary_crop',
  cropDiversity: 'crop_diversity',
  experience: 'experience',
  farmingIncome: 'farming_income',
  otherSources: 'other_sources',
  otherIncome: 'other_income',
  familyMembers: 'family_members',
  occupation: 'occupation',
  hasLoan: 'has_loan',
  loanAmount: 'loan_amount',
  loanPurpose: 'loan_purpose',
  loanSource: 'loan_source',
  profilePhoto: 'profile_photo_url',
  nidPhoto: 'nid_photo_url',
  landPhoto: 'land_photo_url',
  // NOTE: farmer_id, is_verified, credit_score and member_since are deliberately
  // NOT in this map. They are privileged, system/official-assigned fields and must
  // never be settable through the farmer-facing PUT endpoint (which would
  // otherwise allow a farmer to self-verify or set their own credit score via
  // mass assignment). They are still returned by GET (select '*').
};

export const toProfileRow = (input: Record<string, any>): Record<string, any> => {
  const row: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    const col = PROFILE_FIELD_MAP[key];
    if (col) {
      row[col] = value;
    }
  }
  return row;
};

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const updateProfile = async (userId: string, profileData: Record<string, any>) => {
  const row = toProfileRow(profileData);
  const payload = {
    id: userId,
    ...row,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload)
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};
