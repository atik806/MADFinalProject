import { supabase } from '../../../config/supabase';
import { recordAuditLog } from '../../admin/audit/audit.service';
import {
  BankDecisionStatus,
  optionalText,
  requireDecisionStatus,
  requireQueueStatusFilter,
  requireUuid,
  requireVerificationStatusFilter,
  toPositiveNumber,
} from '../validation';

// ------------------------------------------------------------------
// Bank Officer loan review
// ------------------------------------------------------------------
// Where this sits in the shared loan lifecycle:
//
//   draft ──(field officer submits)──> pending
//     │                                  │
//     │                        field officer verifies
//     │                        (verification_status)
//     │                                  │
//     │                        field officer forwards
//     │                        (forwarded_at / forwarded_by)
//     ▼                                  ▼
//   never visible to the bank    ┌── BANK OWNS IT FROM HERE ──┐
//                               pending ──> under_review ──> approved
//                                                        └──> rejected
//
// Hard boundary: the bank only ever sees applications a field officer has
// FORWARDED. A draft, or a submitted-but-not-forwarded application, is treated
// as nonexistent (404) — the bank cannot read it, probe it, or decide on it.
//
// Out of scope for this module (deliberately, see docs): disbursement
// (approved -> active) and repayment tracking (-> completed). Those statuses
// exist in the lifecycle but no endpoint here can set them.

const DECIDED_STATUSES = ['approved', 'rejected', 'active', 'completed'] as const;

// assertForwardedLoan: the single authorization gate for this module. Loads the
// application and refuses anything the field officer has not handed over.
// A missing loan and a not-yet-forwarded loan raise the SAME error so the bank
// cannot distinguish "does not exist" from "not forwarded yet" and therefore
// cannot enumerate the pipeline.
const assertForwardedLoan = async (loanId: string) => {
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
  if (!data.forwarded_at) {
    throw new Error('Loan application not found');
  }

  return data;
};

// Batch-load minimal profile rows so list/detail responses can name the farmer
// and the field officer without trusting anything from the client.
const profileSummaries = async (ids: (string | null | undefined)[]) => {
  const unique = [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  if (unique.length === 0) {
    return new Map<string, Record<string, any>>();
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name_en, name_bn, farmer_id, phone, district, is_verified, credit_score, role')
    .in('id', unique);
  if (error) {
    return new Map<string, Record<string, any>>();
  }
  return new Map<string, Record<string, any>>((data ?? []).map((row: any) => [row.id, row]));
};

export interface ReviewQueueFilters {
  status?: string;
  verificationStatus?: string;
  farmerId?: string;
  page?: number;
  pageSize?: number;
}

// listReviewQueue: the bank's work queue — forwarded applications, newest
// handoff first. Every bank officer shares one queue: there is no branch or
// portfolio assignment table in the schema, so scoping per officer would be
// invented rather than modelled. Who actually decided is recorded in
// bank_officer_id.
export const listReviewQueue = async (filters: ReviewQueueFilters) => {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('loan_applications')
    .select('*', { count: 'exact' })
    .not('forwarded_at', 'is', null)
    .order('forwarded_at', { ascending: false })
    .range(from, to);

  if (filters.status) {
    query = query.eq('status', requireQueueStatusFilter(filters.status));
  }
  if (filters.verificationStatus) {
    query = query.eq('verification_status', requireVerificationStatusFilter(filters.verificationStatus));
  }
  if (filters.farmerId) {
    query = query.eq('farmer_id', requireUuid(filters.farmerId, 'farmerId'));
  }

  const { data, count, error } = await query;
  if (error) {
    // 42P01 = undefined_table, 42703 = undefined_column: the review columns
    // have not been applied yet (run admin.sql). Degrade to an empty queue
    // instead of erroring the whole bank dashboard.
    if ((error as any).code === '42P01' || (error as any).code === '42703') {
      return { items: [], pagination: { page, pageSize, total: 0, totalPages: 1 } };
    }
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const profiles = await profileSummaries([
    ...rows.map((row: any) => row.farmer_id),
    ...rows.map((row: any) => row.field_officer_id),
  ]);

  const items = rows.map((row: any) => ({
    ...row,
    farmer: profiles.get(row.farmer_id) ?? null,
    field_officer: profiles.get(row.field_officer_id) ?? null,
  }));

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

// getReviewApplication: one forwarded application with everything the bank
// needs to decide — the timeline, the farmer (incl. credit score and
// verification flag), and the field officer who verified it.
export const getReviewApplication = async (loanId: string) => {
  const loan = await assertForwardedLoan(loanId);

  const [timelineRes, profiles] = await Promise.all([
    supabase
      .from('loan_timeline')
      .select('*')
      .eq('loan_application_id', loanId)
      .order('step', { ascending: true }),
    profileSummaries([loan.farmer_id, loan.field_officer_id, loan.forwarded_by, loan.bank_officer_id]),
  ]);

  return {
    ...loan,
    timeline: timelineRes.data ?? [],
    farmer: profiles.get(loan.farmer_id) ?? null,
    field_officer: profiles.get(loan.field_officer_id) ?? null,
    forwarded_by_officer: profiles.get(loan.forwarded_by) ?? null,
    bank_officer: profiles.get(loan.bank_officer_id) ?? null,
  };
};

// Best-effort timeline maintenance. The field officer's submit step seeds three
// rows (Submitted / Under Review / Decision); the bank closes out steps 2 and
// 3. A timeline failure must never roll back the decision itself, matching the
// existing submit/verify/forward behaviour.
const completeTimelineStep = async (loanId: string, step: number, label?: string) => {
  try {
    await supabase
      .from('loan_timeline')
      .update({ completed: true, ...(label ? { label } : {}) })
      .eq('loan_application_id', loanId)
      .eq('step', step);
  } catch (err) {
    console.warn('loan_timeline update failed (non-fatal):', err);
  }
};

const notifyFarmer = async (farmerId: string, title: string, description: string) => {
  try {
    await supabase.from('notifications').insert({
      user_id: farmerId,
      title,
      description,
      read: false,
    });
  } catch (err) {
    console.warn('notification insert failed (non-fatal):', err);
  }
};

// markUnderReview: the bank picks the application up. pending -> under_review
// is the only transition this endpoint performs; it is idempotency-hostile on
// purpose so a double-click cannot silently reset review metadata.
export const markUnderReview = async (
  bankOfficerId: string,
  loanId: string,
  officer: { id: string; name: string | null },
) => {
  const existing = await assertForwardedLoan(loanId);

  const currentStatus = String(existing.status ?? '').toLowerCase();
  if (DECIDED_STATUSES.includes(currentStatus as (typeof DECIDED_STATUSES)[number])) {
    throw new Error('Loan application has already been decided');
  }
  if (currentStatus === 'under_review') {
    throw new Error('Loan application is already under review');
  }
  if (currentStatus !== 'pending') {
    throw new Error('Only forwarded, pending loan applications can be moved to review');
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('loan_applications')
    .update({
      status: 'under_review',
      reviewed_at: now,
      bank_officer_id: bankOfficerId,
      updated_at: now,
    })
    .eq('id', loanId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Loan application not found');
  }

  await completeTimelineStep(loanId, 2);
  await notifyFarmer(
    existing.farmer_id,
    'Loan Application Under Review',
    'The bank has started reviewing your loan application.',
  );

  void recordAuditLog({
    actorId: bankOfficerId,
    actorRole: 'bank_officer',
    actorName: officer.name ?? 'Bank Officer',
    action: 'Loan application moved to under review',
    module: 'BankOfficer',
    targetId: loanId,
    targetType: 'loan_application',
    status: 'success',
    details: { farmerId: existing.farmer_id, previousStatus: currentStatus },
  });

  return data;
};

export interface DecisionInput {
  status: BankDecisionStatus | string;
  notes?: string;
  approvedAmount?: string | number;
}

// recordDecision: the bank's final verdict on a forwarded application.
//
// Business rules enforced here:
//  - only forwarded applications are reachable at all (404 otherwise);
//  - the field verification must still say 'verified' — an application whose
//    verification was never completed can never be approved;
//  - only 'pending' or 'under_review' can be decided; a second decision on an
//    already-decided application is refused (400) so an approval cannot be
//    quietly flipped to a rejection;
//  - a rejection MUST carry notes (the farmer and the audit trail need a
//    reason) and must NOT carry a sanctioned amount;
//  - the sanctioned amount defaults to the officer's recommendation, or the
//    requested amount, and can never exceed what the farmer asked for.
export const recordDecision = async (
  bankOfficerId: string,
  loanId: string,
  input: DecisionInput,
  officer: { id: string; name: string | null },
) => {
  const existing = await assertForwardedLoan(loanId);
  const decision = requireDecisionStatus(input.status);

  const currentStatus = String(existing.status ?? '').toLowerCase();
  if (DECIDED_STATUSES.includes(currentStatus as (typeof DECIDED_STATUSES)[number])) {
    throw new Error('Loan application has already been decided');
  }
  if (currentStatus !== 'pending' && currentStatus !== 'under_review') {
    throw new Error('Only forwarded loan applications awaiting a decision can be decided');
  }

  if (String(existing.verification_status ?? '').toLowerCase() !== 'verified') {
    throw new Error('Only field-verified loan applications can be decided');
  }

  const now = new Date().toISOString();
  const updates: Record<string, any> = {
    status: decision,
    decision_at: now,
    bank_officer_id: bankOfficerId,
    updated_at: now,
  };

  if (decision === 'rejected') {
    // A rejection without a reason is unusable for the farmer and unauditable.
    const notes = optionalText(input.notes, 'notes', 2000);
    if (!notes) {
      throw new Error('notes is required when rejecting a loan application');
    }
    if (input.approvedAmount !== undefined && input.approvedAmount !== null && input.approvedAmount !== '') {
      throw new Error('approvedAmount must not be provided when rejecting a loan application');
    }
    updates.decision_notes = notes;
    updates.approved_amount = null;
  } else {
    const requested = Number(existing.amount ?? 0);
    const fallback = existing.recommended_amount ?? existing.amount;
    const approvedAmount =
      input.approvedAmount === undefined || input.approvedAmount === null || input.approvedAmount === ''
        ? toPositiveNumber(fallback, 'approvedAmount')
        : toPositiveNumber(input.approvedAmount, 'approvedAmount');

    // A bank may sanction less than requested, never more.
    if (Number.isFinite(requested) && requested > 0 && approvedAmount > requested) {
      throw new Error('approvedAmount must not exceed the requested loan amount');
    }

    updates.approved_amount = approvedAmount;
    updates.decision_notes = optionalText(input.notes, 'notes', 2000);
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

  await completeTimelineStep(loanId, 3, decision === 'approved' ? 'Approved' : 'Rejected');
  await notifyFarmer(
    existing.farmer_id,
    decision === 'approved' ? 'Loan Application Approved' : 'Loan Application Rejected',
    decision === 'approved'
      ? `Your loan application has been approved for ${updates.approved_amount}.`
      : 'Your loan application was not approved by the bank. Please contact your field officer.',
  );

  void recordAuditLog({
    actorId: bankOfficerId,
    actorRole: 'bank_officer',
    actorName: officer.name ?? 'Bank Officer',
    action: `Loan application ${decision}`,
    module: 'BankOfficer',
    targetId: loanId,
    targetType: 'loan_application',
    status: 'success',
    details: {
      farmerId: existing.farmer_id,
      previousStatus: currentStatus,
      requestedAmount: existing.amount ?? null,
      approvedAmount: updates.approved_amount ?? null,
    },
  });

  return data;
};
