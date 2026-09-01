import { supabase } from '../../../config/supabase';
import { recordAuditLog } from '../../admin/audit/audit.service';
import {
  requireInstallmentType,
  requireText,
  requireUuid,
  toFiniteNumber,
} from '../validation';

// Farmer loan application workflow:
// - A farmer may list/get their OWN applications and submit a new application
//   (which enters the pipeline as `pending`, the same starting status an
//   officer-submitted draft reaches).
// - Status decisions, officer verification, and forwarding are performed by
//   field officers / bank officers through their own endpoints and are never
//   writable here. A farmer cannot approve, reject, or re-status their loans.

const toPositiveAmount = (value: unknown, field: string): number => {
  const n = toFiniteNumber(value, field);
  if (n <= 0) {
    throw new Error(`${field} must be a number greater than 0`);
  }
  return n;
};

const toNonNegativeAmount = (value: unknown, field: string): number => {
  const n = toFiniteNumber(value, field);
  if (n < 0) {
    throw new Error(`${field} must be a non-negative number`);
  }
  return n;
};

// list: the farmer's own applications, newest first.
export const getLoans = async (farmerId: string) => {
  const { data, error } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('application_date', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

// get by id — ownership enforced via farmer_id scoping. A missing row and a
// foreign farmer's row are indistinguishable (both 404).
export const getLoanById = async (farmerId: string, loanId: string) => {
  requireUuid(loanId, 'Loan id');
  const { data, error } = await supabase
    .from('loan_applications')
    .select('*, loan_timeline (*)')
    .eq('id', loanId)
    .eq('farmer_id', farmerId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Loan application not found');
  }
  return data;
};

// apply — creates a new application for the authenticated farmer with
// validated fields. Status is pinned to `pending`; officer/bank workflow
// columns (verification_status, forwarded_at, ...) are left to their owners.
export const applyForLoan = async (
  farmerId: string,
  input: Record<string, any>,
  farmerName: string | null,
) => {
  const title = requireText(input.title, 'title', 255);
  const amount = toPositiveAmount(input.amount, 'amount');
  const duration = requireText(input.duration, 'duration', 50);
  const purpose = requireText(input.purpose, 'purpose', 1000);
  const installmentType = requireInstallmentType(input.installmentType ?? input.installment_type);
  const emi = input.emi === undefined || input.emi === null || input.emi === '' ? 0 : toNonNegativeAmount(input.emi, 'emi');
  const interest = input.interest === undefined || input.interest === null || input.interest === '' ? 0 : toNonNegativeAmount(input.interest, 'interest');

  const { data, error } = await supabase
    .from('loan_applications')
    .insert({
      farmer_id: farmerId,
      title,
      amount,
      duration,
      purpose,
      installment_type: installmentType,
      emi,
      interest,
      status: 'pending',
      application_date: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    if ((error as any).code === '42P01') {
      throw new Error('loan_applications table does not exist — run farmer_db.sql schema');
    }
    throw new Error(error.message);
  }

  await supabase.from('loan_timeline').insert([
    { loan_application_id: data.id, step: 1, label: 'Application Submitted', completed: true },
    { loan_application_id: data.id, step: 2, label: 'Under Review', completed: false },
    { loan_application_id: data.id, step: 3, label: 'Decision', completed: false },
  ]);
  await supabase.from('notifications').insert({
    user_id: farmerId,
    title: 'Loan Application Submitted',
    description: 'Your loan application has been submitted successfully.',
    read: false,
  });

  void recordAuditLog({
    actorId: farmerId,
    actorRole: 'farmer',
    actorName: farmerName ?? 'Farmer',
    action: 'Submitted loan application',
    module: 'Farmer',
    targetId: data.id,
    targetType: 'loan_application',
    status: 'success',
    details: { amount, title },
  });

  return data;
};
