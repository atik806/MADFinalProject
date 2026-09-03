import { supabase } from '../../../config/supabase';
import { optionalText } from '../validation';

// White-list of fields a bank officer may edit on their own profile.
// role, status, is_verified, credit_score, farmer_id, nid and the bank posting
// fields (bank_name / branch_name / branch_code) are privileged: the posting is
// set by the admin at provisioning time, so allowing self-edit would let an
// officer reassign themselves to another branch.
const BANK_OFFICER_UPDATE_FIELDS = [
  'name_en',
  'name_bn',
  'email',
  'phone',
  'dob',
  'gender',
  'designation',
  'profile_photo_url',
] as const;

const normalizePhone = (phone: string): string => {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('880')) return `+${digits}`;
  if (digits.startsWith('0')) return `+88${digits}`;
  return `+880${digits}`;
};

// Scoped by both id AND role so a token belonging to another role can never
// read or write a row through this service even if the guard were bypassed.
export const getSelfProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .eq('role', 'bank_officer')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Bank officer profile not found');
  }
  return data;
};

export const updateSelfProfile = async (userId: string, payload: Record<string, any>) => {
  const updates: Record<string, any> = {};
  for (const key of BANK_OFFICER_UPDATE_FIELDS) {
    if (key in payload) {
      updates[key] = payload[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No updatable fields provided');
  }

  for (const [key, value] of Object.entries(updates)) {
    updates[key] = optionalText(value, key, key === 'profile_photo_url' ? 1000 : 255);
  }

  if (typeof updates.phone === 'string' && updates.phone.length > 0) {
    updates.phone = normalizePhone(updates.phone);
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .eq('role', 'bank_officer')
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Bank officer profile not found');
  }
  return data;
};
