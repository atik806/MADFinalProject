import { supabase } from '../../../config/supabase';

// Dashboard aggregates for one farmer. Every query is scoped by the farmer id
// derived from the verified token — never from the request body — so this
// endpoint cannot be used to read another farmer's data.
//
// The farmer id is guaranteed present by the controller's auth check, so it is
// a required parameter here rather than an optional one that throws.
export const getDashboard = async (farmerId: string) => {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', farmerId)
    .eq('role', 'farmer')
    .maybeSingle();

  // maybeSingle so a missing row is distinguishable from a real DB failure:
  // single() raises PGRST116 for "no rows", which would be reported as a 500
  // instead of the 404 the controller maps 'not found' to.
  if (profileError) {
    throw new Error(profileError.message);
  }
  if (!profile) {
    throw new Error('Farmer profile not found');
  }

  const [transactionsRes, loansRes, transactionCountRes, loanCountRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('date', { ascending: false })
      .limit(5),
    supabase
      .from('loan_applications')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('application_date', { ascending: false })
      .limit(5),
    supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('farmer_id', farmerId),
    supabase
      .from('loan_applications')
      .select('*', { count: 'exact', head: true })
      .eq('farmer_id', farmerId),
  ]);

  return {
    profile,
    creditScore: profile.credit_score ?? 0,
    transactions: transactionsRes.data ?? [],
    loans: loansRes.data ?? [],
    transactionCount: transactionCountRes.count ?? 0,
    loanCount: loanCountRes.count ?? 0,
  };
};
