import { supabase } from '../../../config/supabase';

export const getDashboard = async (farmerId?: string) => {
  if (!farmerId) {
    throw new Error('Unauthorized');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', farmerId)
    .single();

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('date', { ascending: false })
    .limit(5);

  const { data: loans } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('application_date', { ascending: false })
    .limit(5);

  const { count: transactionCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('farmer_id', farmerId);

  const { count: loanCount } = await supabase
    .from('loan_applications')
    .select('*', { count: 'exact', head: true })
    .eq('farmer_id', farmerId);

  return {
    profile,
    creditScore: profile?.credit_score ?? 0,
    transactions: transactions ?? [],
    loans: loans ?? [],
    transactionCount: transactionCount ?? 0,
    loanCount: loanCount ?? 0,
  };
};
