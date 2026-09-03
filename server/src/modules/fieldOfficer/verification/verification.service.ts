import { supabase } from '../../../config/supabase';
import { recordAuditLog } from '../../admin/audit/audit.service';
import { assertAssigned } from '../farmers/farmers.service';
import { optionalBoolean, optionalStringArray, optionalText, requireText, requireUuid } from '../validation';

const VERIFICATION_STATUSES = ['pending', 'verified', 'rejected'] as const;

const normalizeStatus = (value: unknown): (typeof VERIFICATION_STATUSES)[number] => {
  const status = String(value ?? '').trim().toLowerCase();
  if (!VERIFICATION_STATUSES.includes(status as (typeof VERIFICATION_STATUSES)[number])) {
    throw new Error(`Invalid verification status. Allowed: ${VERIFICATION_STATUSES.join(', ')}`);
  }
  return status as (typeof VERIFICATION_STATUSES)[number];
};

const verificationUpdates = (input: VerifyFarmerInput, status: string) => {
  const updates: Record<string, unknown> = {
    status,
    verified_at: status === 'verified' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  if (input.notes !== undefined) updates.notes = optionalText(input.notes, 'notes', 2000);
  if (input.verificationType !== undefined) updates.verification_type = requireText(input.verificationType, 'verificationType', 100);
  if (input.photoUrls !== undefined) updates.photo_urls = optionalStringArray(input.photoUrls, 'photoUrls');
  if (input.documentsChecked !== undefined) updates.documents_checked = optionalStringArray(input.documentsChecked, 'documentsChecked');
  if (input.farmerPresent !== undefined) updates.farmer_present = optionalBoolean(input.farmerPresent, 'farmerPresent');
  if (input.landVerified !== undefined) updates.land_verified = optionalBoolean(input.landVerified, 'landVerified');
  if (input.documentsVerified !== undefined) updates.documents_verified = optionalBoolean(input.documentsVerified, 'documentsVerified');

  return updates;
};

const reconcileProfile = async (farmerId: string, status: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ is_verified: status === 'verified', updated_at: new Date().toISOString() })
    .eq('id', farmerId)
    .eq('role', 'farmer');
  if (error) throw new Error(error.message);
};

export interface VerifyFarmerInput {
  status?: string;
  notes?: string;
  verificationType?: string;
  photoUrls?: string[];
  documentsChecked?: string[];
  farmerPresent?: boolean;
  landVerified?: boolean;
  documentsVerified?: boolean;
}

// verifyFarmer: records a verification decision for an assigned farmer and
// reconciles the farmer profile's is_verified flag with that decision.
// History is preserved — every submission inserts a NEW farmer_verifications
// row keyed to the responsible officer (field_officer_id); it never overwrites
// prior rows. is_verified is flipped to true only on a 'verified' verdict and
// only after the officer is confirmed to be assigned to that farmer.
export const verifyFarmer = async (
  officerId: string,
  farmerId: string,
  input: VerifyFarmerInput,
  officer: { id: string; name: string | null },
) => {
  await assertAssigned(officerId, farmerId);

  const status = normalizeStatus(input.status);
  const updates = verificationUpdates(input, status);
  if (input.verificationType === undefined) updates.verification_type = 'profile';
  if (input.photoUrls === undefined) updates.photo_urls = [];
  if (input.documentsChecked === undefined) updates.documents_checked = [];
  if (input.farmerPresent === undefined) updates.farmer_present = false;
  if (input.landVerified === undefined) updates.land_verified = false;
  if (input.documentsVerified === undefined) updates.documents_verified = false;

  const { data: verification, error: insertError } = await supabase
    .from('farmer_verifications')
    .insert({
      farmer_id: farmerId,
      field_officer_id: officerId,
      ...updates,
    })
    .select()
    .single();

  if (insertError) {
    if ((insertError as any).code === '42P01') {
      throw new Error('farmer_verifications table does not exist — run admin.sql schema');
    }
    throw new Error(insertError.message);
  }

  // Reconcile the farmer profile's verified flag. Only a 'verified' verdict
  // flips is_verified to true; rejected/pending leave it false. This avoids
  // blindly flipping is_verified without an authorization check + record.
  const isVerified = status === 'verified';
  await reconcileProfile(farmerId, status);

  void recordAuditLog({
    actorId: officerId,
    actorRole: 'field_officer',
    actorName: officer.name ?? 'Field Officer',
    action: `Farmer verification ${status}`,
    module: 'FieldOfficer',
    targetId: farmerId,
    targetType: 'farmer',
    status: 'success',
    details: { verificationId: verification.id, status },
  });

  // Return the reconciliation outcome so callers can reflect it without
  // re-querying; the full verification history row is also included.
  return { verification: { ...verification, is_verified: isVerified }, is_verified: isVerified };
};

// updateVerification edits a verification record owned by the current officer.
// The farmer assignment is checked again so a previously assigned officer cannot
// keep changing records after the assignment is revoked.
export const updateVerification = async (
  officerId: string,
  verificationId: string,
  input: VerifyFarmerInput,
  officer: { id: string; name: string | null },
) => {
  requireUuid(verificationId, 'Verification id');

  const { data: existing, error: lookupError } = await supabase
    .from('farmer_verifications')
    .select('*')
    .eq('id', verificationId)
    .eq('field_officer_id', officerId)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!existing) throw new Error('Verification not found or not owned by this field officer');

  await assertAssigned(officerId, existing.farmer_id);
  const status = input.status === undefined ? normalizeStatus(existing.status) : normalizeStatus(input.status);
  const hasEditableField = Object.keys(input).some((key) =>
    ['status', 'notes', 'verificationType', 'photoUrls', 'documentsChecked', 'farmerPresent', 'landVerified', 'documentsVerified'].includes(key),
  );
  if (!hasEditableField) throw new Error('No updatable verification fields provided');

  const updates = verificationUpdates(input, status);
  const { data: verification, error: updateError } = await supabase
    .from('farmer_verifications')
    .update(updates)
    .eq('id', verificationId)
    .eq('field_officer_id', officerId)
    .select()
    .maybeSingle();
  if (updateError) throw new Error(updateError.message);
  if (!verification) throw new Error('Verification not found or not owned by this field officer');

  await reconcileProfile(existing.farmer_id, status);
  void recordAuditLog({
    actorId: officerId,
    actorRole: 'field_officer',
    actorName: officer.name ?? 'Field Officer',
    action: `Updated farmer verification ${status}`,
    module: 'FieldOfficer',
    targetId: existing.farmer_id,
    targetType: 'farmer',
    status: 'success',
    details: { verificationId, status },
  });

  return { verification: { ...verification, is_verified: status === 'verified' }, is_verified: status === 'verified' };
};

export interface ListVerificationsFilters {
  status?: string;
  page?: number;
  pageSize?: number;
}

// listVerificationsForOfficer: returns the verification history created by the
// given officer (scoped by field_officer_id). An officer therefore only ever
// sees their own verification actions.
export const listVerificationsForOfficer = async (officerId: string, filters: ListVerificationsFilters) => {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('farmer_verifications')
    .select('*', { count: 'exact' })
    .eq('field_officer_id', officerId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.status) {
    query = query.eq('status', normalizeStatus(filters.status));
  }

  const { data, count, error } = await query;
  if (error) {
    if ((error as any).code === '42P01') {
      return { items: [], pagination: { page, pageSize, total: 0, totalPages: 1 } };
    }
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
