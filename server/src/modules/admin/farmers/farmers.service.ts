import { supabaseAdmin } from '../../../config/supabase';
import { parsePage, requireUuid, sanitizeSearch } from '../users/validation';

// ------------------------------------------------------------------
// Admin farmer directory — READ-ONLY
// ------------------------------------------------------------------
// Farmers are verified by Field Officers (farmer_verifications is an
// officer-owned flow) and mutate their own profile through /api/farmer/me.
// The admin's interest is visibility: who the farmers are, where they farm,
// and their verification/credit state. There is deliberately NO write path
// here — account-level suspension lives in the unified users module.

const FARMER_LIST_COLUMNS =
  'id, name_en, name_bn, farmer_id, phone, email, district, upazila, union_, village, primary_crop, secondary_crop, total_land, farm_size, is_verified, credit_score, status, member_since, created_at';

const escapeIlike = (term: string) => term.replace(/[%_]/g, '\\$&');

export interface ListFarmersFilters {
  search?: string;
  district?: string;
  verification?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export const listFarmers = async (filters: ListFarmersFilters) => {
  const page = parsePage(filters.page ?? 1, 1, 'page');
  const pageSize = Math.min(Math.max(parsePage(filters.pageSize ?? 20, 20, 'pageSize'), 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('profiles')
    .select(FARMER_LIST_COLUMNS, { count: 'exact' })
    .eq('role', 'farmer')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.district) {
    query = query.eq('district', sanitizeSearch(filters.district, 'district', 100));
  }

  if (filters.verification) {
    const value = String(filters.verification).trim().toLowerCase();
    if (value !== 'verified' && value !== 'unverified') {
      throw new Error('verification must be one of: verified, unverified');
    }
    query = value === 'verified'
      ? query.eq('is_verified', true)
      : query.neq('is_verified', true);
  }

  if (filters.status) {
    query = query.eq('status', String(filters.status).trim().toLowerCase());
  }

  if (filters.search) {
    const term = escapeIlike(sanitizeSearch(filters.search, 'search'));
    const pattern = `%${term}%`;
    query = query.or(
      `name_en.ilike.${pattern},name_bn.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern},farmer_id.ilike.${pattern},village.ilike.${pattern},upazila.ilike.${pattern}`,
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
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  };
};

// getFarmerById: full farmer profile plus the officer verification history —
// the same rows the credit profile shows the farmer, but from the admin's
// vantage. Read-only by construction.
export const getFarmerById = async (rawId: unknown) => {
  const id = requireUuid(rawId, 'Farmer id');

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'farmer')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!profile) {
    throw new Error('Farmer not found');
  }

  // Verification history written by field officers (admin views it; the
  // farmer sees the same records through /api/farmer/credit).
  const { data: verifications, error: vError } = await supabaseAdmin
    .from('farmer_verifications')
    .select('id, status, verification_type, verified_at, notes, field_officer_id, created_at')
    .eq('farmer_id', id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (vError) {
    // The verification table may legitimately be empty; a read error must not
    // 500 the whole detail view.
    console.error('Failed to load farmer verifications:', vError);
  }

  return {
    ...profile,
    verificationHistory: verifications ?? [],
  };
};
