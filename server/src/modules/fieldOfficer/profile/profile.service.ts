import { supabase } from '../../../config/supabase';
import { optionalText } from '../validation';

// White-list of editable fields for a field officer's own profile. Role,
// farmer_id, is_verified, credit_score, status and the supervised_* assignment
// fields are privileged/system-managed and must never be settable through the
// officer-facing PUT /me endpoint (which would otherwise allow mass assignment
// of role or verification state).
const FIELD_OFFICER_UPDATE_FIELDS = [
  'name_en',
  'name_bn',
  'email',
  'phone',
  'nid',
  'dob',
  'gender',
  'employee_id',
  'designation',
  'office_address',
  'joining_date',
  'profile_photo_url',
] as const;

const normalizePhone = (phone: string): string => {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('880')) return `+${digits}`;
  if (digits.startsWith('0')) return `+88${digits}`;
  return `+880${digits}`;
};

export const getSelfProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .eq('role', 'field_officer')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Field officer profile not found');
  }
  return data;
};

export const updateSelfProfile = async (userId: string, payload: Record<string, any>) => {
  const updates: Record<string, any> = {};
  for (const key of FIELD_OFFICER_UPDATE_FIELDS) {
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
    .eq('role', 'field_officer')
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Field officer profile not found');
  }
  return data;
};
