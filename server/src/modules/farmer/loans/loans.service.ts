import { supabase } from '../../../config/supabase';
import { ensureFieldOfficerAssignment } from '../../shared/fieldOfficerAssignment';
import { computeRepaymentUpdate } from '../../shared/loanRepayment';


//this is for getting all the loans of a farmer
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

//this is for getting a specific loan by id

export const getLoanById = async (farmerId: string, loanId: string) => {
  const { data, error } = await supabase
    .from('loan_applications')
    .select('*, loan_timeline (*), loan_repayments (*)')
    .eq('id', loanId)
    .eq('farmer_id', farmerId)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

//this is for applying for a new loan

export const applyForLoan = async (farmerId: string, input: Record<string, any>) => {
  const { title, amount, duration, purpose, installment_type } = input;
  if (!title || !amount || !duration || !purpose || !installment_type) {
    throw new Error('Missing required fields');
  }
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('loan_applications')
    .insert({
      farmer_id: farmerId,
      title,
      amount,
      duration,
      purpose,
      installment_type,
      emi: Number(input.emi) || 0,
      status: 'pending',
      application_date: now,
      // A farmer-submitted application goes straight to the bank — no field
      // officer review gate. Stamped verified/forwarded at submission time
      // so the bank's review queue (which only shows forwarded_at IS NOT
      // NULL) picks it up immediately.
      verification_status: 'verified',
      verified_at: now,
      verification_notes: 'Auto-verified: submitted directly by the farmer.',
      forwarded_at: now,
    })
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }

  await supabase.from('loan_timeline').insert([
    { loan_application_id: data.id, step: 1, label: 'Application Submitted', completed: true },
    { loan_application_id: data.id, step: 2, label: 'Under Review', completed: true },
    { loan_application_id: data.id, step: 3, label: 'Decision', completed: false },
  ]);
  await supabase.from('notifications').insert({
    user_id: farmerId,
    title: 'Loan Application Submitted',
    description: 'Your loan application has been submitted and sent to the bank for review.',
    read: false,
  });

  // Not on the loan's critical path anymore (applications go straight to the
  // bank, see above) but still used by the officer's own farmer-portfolio
  // views, so keep self-healing it here. Login already does the same (see
  // farmer/auth/auth.service.ts); a fresh session's first request can race
  // ahead of it. Best-effort, never blocks.
  void ensureFieldOfficerAssignment(farmerId);

  return data;
};

//this is for a farmer repaying one EMI on their own approved loan
export const repayLoan = async (farmerId: string, loanId: string) => {
  const { data: loan, error: loadError } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('id', loanId)
    .eq('farmer_id', farmerId)
    .maybeSingle();
  if (loadError) {
    throw new Error(loadError.message);
  }
  if (!loan) {
    throw new Error('Loan not found');
  }
  if (String(loan.status).toLowerCase() !== 'approved') {
    throw new Error('Only approved loans can be repaid');
  }

  const update = computeRepaymentUpdate(loan);

  const { error: repaymentError } = await supabase.from('loan_repayments').insert({
    loan_application_id: loanId,
    farmer_id: farmerId,
    amount: update.amount,
    paid_by: farmerId,
    paid_by_role: 'farmer',
  });
  if (repaymentError) {
    throw new Error(repaymentError.message);
  }

  const { data, error } = await supabase
    .from('loan_applications')
    .update({
      installments_paid: update.installments_paid,
      installments_total: update.installments_total,
      progress: update.progress,
      next_payment_date: update.next_payment_date,
      next_payment_amount: update.next_payment_amount,
      status: update.completed ? 'completed' : loan.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', loanId)
    .select('*, loan_timeline (*), loan_repayments (*)')
    .single();
  if (error) {
    throw new Error(error.message);
  }

  await supabase.from('notifications').insert({
    user_id: farmerId,
    title: update.completed ? 'Loan Fully Repaid' : 'Loan Repayment Received',
    description: update.completed
      ? `Your final EMI of ৳${update.amount.toLocaleString('en-BD')} has been recorded. This loan is now fully repaid.`
      : `Your EMI payment of ৳${update.amount.toLocaleString('en-BD')} has been recorded.`,
    read: false,
  });

  return data;
};
