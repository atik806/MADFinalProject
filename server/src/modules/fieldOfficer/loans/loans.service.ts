import { supabase } from '../../../config/supabase';
import { recordAuditLog } from '../../admin/audit/audit.service';
import { assertAssigned, fetchAssignedFarmerIdSet } from '../farmers/farmers.service';
import { optionalText, parseIsoDate, requireText, requireUuid } from '../validation';

const APPLICATION_STATUSES = ['draft', 'pending', 'under_review', 'approved', 'rejected', 'active', 'completed'] as const;
const VERIFICATION_STATUSES = ['pending', 'verified', 'rejected'] as const;
const VERIFICATION_VERDICTS = ['verified', 'rejected'] as const;
const INSTALLMENT_TYPES = ['monthly', 'seasonal'] as const;

// Field Officer loan workflow:
// - An officer creates applications on behalf of actively assigned farmers as
//   DRAFTs, can edit them while they are still drafts, and submits them into
//   the review pipeline (draft -> pending).
// - Once submitted, the officer verifies (verification_status) and forwards
//   (forwarded_at / forwarded_by) the application to the bank.
// - Application status decisions beyond that (under_review / approved / ...)
//   belong to the bank officer / admin and are never writable through these
//   endpoints.

const toNumber = (value: unknown, field: string): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  throw new Error(`${field} must be a number`);
};

const toPositiveNumber = (value: unknown, field: string): number => {
  const n = toNumber(value, field);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${field} must be a number greater than 0`);
  }
  return n;
};

const toNonNegativeNumber = (value: unknown, field: string): number => {
  const n = toNumber(value, field);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${field} must be a non-negative number`);
  }
  return n;
};

const requireInstallmentType = (value: unknown): string => {
  const type = String(value ?? '').trim().toLowerCase();
  if (!INSTALLMENT_TYPES.includes(type as (typeof INSTALLMENT_TYPES)[number])) {
    throw new Error(`installmentType is invalid. Allowed: ${INSTALLMENT_TYPES.join(', ')}`);
  }
  return type;
};

const requireApplicationStatusFilter = (value: unknown): string => {
  const status = String(value ?? '').trim().toLowerCase();
  if (!APPLICATION_STATUSES.includes(status as (typeof APPLICATION_STATUSES)[number])) {
    throw new Error(`Invalid application status. Allowed: ${APPLICATION_STATUSES.join(', ')}`);
  }
  return status;
};

const requireVerificationStatusFilter = (value: unknown): string => {
  const status = String(value ?? '').trim().toLowerCase();
  if (!VERIFICATION_STATUSES.includes(status as (typeof VERIFICATION_STATUSES)[number])) {
    throw new Error(`Invalid verification status. Allowed: ${VERIFICATION_STATUSES.join(', ')}`);
  }
  return status;
};

// assertLoanForOfficer: loads a loan application and enforces that its farmer
// is actively assigned to the given officer. A missing loan and an
// unauthorized loan are indistinguishable (both resolve to 404) so an officer
// cannot probe other officers' applications.
const assertLoanForOfficer = async (officerId: string, loanId: string) => {
  requireUuid(loanId, 'Loan id');
  const { data, error } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('id', loanId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Loan application not found');
  }
  await assertAssigned(officerId, data.farmer_id);
  return data;
};

// farmerSummaries: batch-loads minimal farmer profiles for a page of loans so
// list/get responses can show who each application belongs to without
// exposing or trusting client-supplied farmer data.
const farmerSummaries = async (farmerIds: string[]) => {
  const unique = [...new Set(farmerIds.filter((id) => typeof id === 'string' && id))];
  if (unique.length === 0) {
    return new Map<string, Record<string, any>>();
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name_en, name_bn, farmer_id, is_verified')
    .in('id', unique);
  if (error) {
    return new Map<string, Record<string, any>>();
  }
  return new Map<string, Record<string, any>>((data ?? []).map((profile: any) => [profile.id, profile]));
};

export interface CreateLoanInput {
  farmerId: string;
  title: string;
  amount: string | number;
  duration: string;
  purpose: string;
  installmentType: string;
  emi?: string | number;
  interest?: string | number;
  date?: string;
}

// createLoanApplication: creates a DRAFT loan application for a farmer the
// officer is actively assigned to. The farmer relationship and the creating
// officer are always derived server-side; the application status lifecycle
// starts at draft and moves to pending only via submitLoanApplication.
export const createLoanApplication = async (
  officerId: string,
  input: CreateLoanInput,
  officer: { id: string; name: string | null },
) => {
  requireUuid(input.farmerId, 'farmerId');
  await assertAssigned(officerId, input.farmerId);

  const title = requireText(input.title, 'title', 255);
  const amount = toPositiveNumber(input.amount, 'amount');
  const duration = requireText(input.duration, 'duration', 50);
  const purpose = requireText(input.purpose, 'purpose', 1000);
  const installmentType = requireInstallmentType(input.installmentType);
  const emi = input.emi === undefined || input.emi === null ? 0 : toNonNegativeNumber(input.emi, 'emi');
  const interest = input.interest === undefined || input.interest === null ? 0 : toNonNegativeNumber(input.interest, 'interest');
  const date = input.date === undefined || input.date === null ? new Date().toISOString() : parseIsoDate(input.date, 'date');

  const { data, error } = await supabase
    .from('loan_applications')
    .insert({
      farmer_id: input.farmerId,
      field_officer_id: officerId,
      title,
      amount,
      duration,
      purpose,
      installment_type: installmentType,
      emi,
      interest,
      date,
      status: 'draft',
      verification_status: 'pending',
    })
    .select()
    .single();

  if (error) {
    if ((error as any).code === '42P01') {
      throw new Error('loan_applications table does not exist — run farmer_db.sql schema');
    }
    throw new Error(error.message);
  }

  void recordAuditLog({
    actorId: officerId,
    actorRole: 'field_officer',
    actorName: officer.name ?? 'Field Officer',
    action: 'Created loan application draft',
    module: 'FieldOfficer',
    targetId: data.id,
    targetType: 'loan_application',
    status: 'success',
    details: { farmerId: input.farmerId, amount },
  });

  return data;
};

export interface ListLoansFilters {
  status?: string;
  verificationStatus?: string;
  farmerId?: string;
  page?: number;
  pageSize?: number;
}

// listLoanApplications: returns applications of the farmers actively assigned
// to this officer only. An officer with no assignments sees an empty list.
export const listLoanApplications = async (officerId: string, filters: ListLoansFilters) => {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const assignedIds = await fetchAssignedFarmerIdSet(officerId);
  if (assignedIds.length === 0) {
    return { items: [], pagination: { page, pageSize, total: 0, totalPages: 1 } };
  }

  let query = supabase
    .from('loan_applications')
    .select('*', { count: 'exact' })
    .in('farmer_id', assignedIds)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.status) {
    query = query.eq('status', requireApplicationStatusFilter(filters.status));
  }
  if (filters.verificationStatus) {
    query = query.eq('verification_status', requireVerificationStatusFilter(filters.verificationStatus));
  }
  if (filters.farmerId) {
    query = query.eq('farmer_id', requireUuid(filters.farmerId, 'farmerId'));
  }

  const { data, count, error } = await query;
  if (error) {
    if ((error as any).code === '42P01') {
      return { items: [], pagination: { page, pageSize, total: 0, totalPages: 1 } };
    }
    throw new Error(error.message);
  }

  const farmers = await farmerSummaries((data ?? []).map((row: any) => row.farmer_id));
  const items = (data ?? []).map((row: any) => ({ ...row, farmer: farmers.get(row.farmer_id) ?? null }));

  return {
    items,
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  };
};

// getLoanApplication: returns one authorized application with its timeline
// steps and a farmer summary.
export const getLoanApplication = async (officerId: string, loanId: string) => {
  const loan = await assertLoanForOfficer(officerId, loanId);

  const [timelineRes, farmers] = await Promise.all([
    supabase
      .from('loan_timeline')
      .select('*')
      .eq('loan_application_id', loanId)
      .order('step', { ascending: true }),
    farmerSummaries([loan.farmer_id]),
  ]);

  return {
    ...loan,
    timeline: timelineRes.data ?? [],
    farmer: farmers.get(loan.farmer_id) ?? null,
  };
};

const LOAN_UPDATE_FIELDS = ['title', 'amount', 'duration', 'purpose', 'installmentType', 'emi', 'interest', 'date'] as const;

// updateLoanApplication: edits a DRAFT application for an assigned farmer.
// Protected columns (farmer_id, field_officer_id, status, verification_status,
// forwarded_at, forwarded_by, verified_at, approval fields, created_at) are
// never writable here — the client can only fix form data on a draft.
export const updateLoanApplication = async (
  officerId: string,
  loanId: string,
  payload: Record<string, any>,
  officer: { id: string; name: string | null },
) => {
  const existing = await assertLoanForOfficer(officerId, loanId);

  if (String(existing.status).toLowerCase() !== 'draft') {
    throw new Error('Only draft loan applications can be edited');
  }

  const updates: Record<string, any> = {};
  for (const key of LOAN_UPDATE_FIELDS) {
    if (key in payload) {
      const value = payload[key];
      if (key === 'title') updates.title = requireText(value, 'title', 255);
      if (key === 'amount') updates.amount = toPositiveNumber(value, 'amount');
      if (key === 'duration') updates.duration = requireText(value, 'duration', 50);
      if (key === 'purpose') updates.purpose = requireText(value, 'purpose', 1000);
      if (key === 'installmentType') updates.installment_type = requireInstallmentType(value);
      if (key === 'emi') updates.emi = toNonNegativeNumber(value, 'emi');
      if (key === 'interest') updates.interest = toNonNegativeNumber(value, 'interest');
      if (key === 'date') updates.date = parseIsoDate(value, 'date');
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No updatable fields provided');
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('loan_applications')
    .update(updates)
    .eq('id', loanId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Loan application not found');
  }

  void recordAuditLog({
    actorId: officerId,
    actorRole: 'field_officer',
    actorName: officer.name ?? 'Field Officer',
    action: 'Updated loan application draft',
    module: 'FieldOfficer',
    targetId: loanId,
    targetType: 'loan_application',
    status: 'success',
    details: { fields: Object.keys(updates) },
  });

  return data;
};

// submitLoanApplication: moves a draft into the review pipeline
// (draft -> pending), stamps the submission time, writes the initial
// timeline step, and notifies the farmer. The status transition is the only
// status change an officer can make.
export const submitLoanApplication = async (
  officerId: string,
  loanId: string,
  officer: { id: string; name: string | null },
) => {
  const existing = await assertLoanForOfficer(officerId, loanId);

  const currentStatus = String(existing.status).toLowerCase();
  if (currentStatus !== 'draft') {
    throw new Error('Only draft loan applications can be submitted');
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('loan_applications')
    .update({ status: 'pending', application_date: now, updated_at: now })
    .eq('id', loanId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Loan application not found');
  }

  // Timeline + farmer notification are best-effort follow-ups; a failure
  // there must not roll back the submitted status, matching the farmer
  // module's applyForLoan behavior.
  await supabase.from('loan_timeline').insert([
    { loan_application_id: loanId, step: 1, label: 'Application Submitted', completed: true },
    { loan_application_id: loanId, step: 2, label: 'Under Review', completed: false },
    { loan_application_id: loanId, step: 3, label: 'Decision', completed: false },
  ]);
  await supabase.from('notifications').insert({
    user_id: existing.farmer_id,
    title: 'Loan Application Submitted',
    description: 'Your loan application has been submitted for review.',
    read: false,
  });

  void recordAuditLog({
    actorId: officerId,
    actorRole: 'field_officer',
    actorName: officer.name ?? 'Field Officer',
    action: 'Submitted loan application',
    module: 'FieldOfficer',
    targetId: loanId,
    targetType: 'loan_application',
    status: 'success',
    details: { farmerId: existing.farmer_id, status: 'pending' },
  });

  return data;
};

export interface VerifyLoanInput {
  status: 'verified' | 'rejected';
  notes?: string;
}

// verifyLoanApplication: the officer's verification verdict on a submitted
// application. Only pending -> verified/rejected via verification_status;
// the application status (under_review/approved/...) stays with the bank.
export const verifyLoanApplication = async (
  officerId: string,
  loanId: string,
  input: VerifyLoanInput,
  officer: { id: string; name: string | null },
) => {
  const existing = await assertLoanForOfficer(officerId, loanId);

  const verdict = String(input.status ?? '').trim().toLowerCase();
  if (!VERIFICATION_VERDICTS.includes(verdict as (typeof VERIFICATION_VERDICTS)[number])) {
    throw new Error(`Invalid verification verdict. Allowed: ${VERIFICATION_VERDICTS.join(', ')}`);
  }

  const currentStatus = String(existing.status).toLowerCase();
  if (currentStatus === 'draft') {
    throw new Error('Draft loan applications must be submitted before verification');
  }
  if (existing.forwarded_at) {
    throw new Error('Forwarded loan applications are with the bank and can no longer be verified by a field officer');
  }

  const now = new Date().toISOString();
  const updates: Record<string, any> = {
    verification_status: verdict,
    verified_at: now,
    updated_at: now,
  };
  if (input.notes !== undefined) {
    updates.verification_notes = optionalText(input.notes, 'notes', 2000);
  }

  const { data, error } = await supabase
    .from('loan_applications')
    .update(updates)
    .eq('id', loanId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Loan application not found');
  }

  // The bank only sees applications the officer has signed off on: mark
  // verification as officer-linked and notify the farmer of the verdict.
  await supabase.from('notifications').insert({
    user_id: existing.farmer_id,
    title: verdict === 'verified' ? 'Loan Application Verified' : 'Loan Application Rejected by Field Officer',
    description:
      verdict === 'verified'
        ? 'Your loan application passed field verification and will be forwarded to the bank.'
        : 'Your loan application did not pass field verification. Please contact your field officer.',
    read: false,
  });

  void recordAuditLog({
    actorId: officerId,
    actorRole: 'field_officer',
    actorName: officer.name ?? 'Field Officer',
    action: `Loan application verification ${verdict}`,
    module: 'FieldOfficer',
    targetId: loanId,
    targetType: 'loan_application',
    status: 'success',
    details: { verdict, notes: updates.verification_notes ?? null },
  });

  return data;
};

export interface ForwardLoanInput {
  recommendedAmount?: string | number;
  notes?: string;
}

// forwardLoanApplication: sends a verified application to the bank. Requires
// verification_status 'verified'; a rejected or unverified application cannot
// be forwarded. The bank-facing decision fields are stamped server-side.
export const forwardLoanApplication = async (
  officerId: string,
  loanId: string,
  input: ForwardLoanInput,
  officer: { id: string; name: string | null },
) => {
  const existing = await assertLoanForOfficer(officerId, loanId);

  if (String(existing.verification_status).toLowerCase() !== 'verified') {
    throw new Error('Only field-verified loan applications can be forwarded to the bank');
  }

  if (existing.forwarded_at) {
    throw new Error('Loan application is already forwarded to the bank');
  }

  const now = new Date().toISOString();
  const updates: Record<string, any> = {
    forwarded_at: now,
    forwarded_by: officerId,
    updated_at: now,
  };
  if (input.recommendedAmount !== undefined && input.recommendedAmount !== null && input.recommendedAmount !== '') {
    updates.recommended_amount = toPositiveNumber(input.recommendedAmount, 'recommendedAmount');
  }
  if (input.notes !== undefined) {
    updates.verification_notes = optionalText(input.notes, 'notes', 2000);
  }

  const { data, error } = await supabase
    .from('loan_applications')
    .update(updates)
    .eq('id', loanId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Loan application not found');
  }

  await supabase.from('notifications').insert({
    user_id: existing.farmer_id,
    title: 'Loan Application Forwarded to Bank',
    description: 'Your verified loan application has been forwarded to the bank for approval.',
    read: false,
  });

  void recordAuditLog({
    actorId: officerId,
    actorRole: 'field_officer',
    actorName: officer.name ?? 'Field Officer',
    action: 'Forwarded loan application to bank',
    module: 'FieldOfficer',
    targetId: loanId,
    targetType: 'loan_application',
    status: 'success',
    details: { recommendedAmount: updates.recommended_amount ?? null },
  });

  return data;
};
