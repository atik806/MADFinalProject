import { supabase } from '../../../config/supabase';


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
    .select('*, loan_timeline (*)')
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
      application_date: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
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

  return data;
};
