import { supabase } from '../../../config/supabase';

//get all transactions for a farmer
export const getTransactions = async (farmerId: string) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('date', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

//gettomg tje transaction by id for a farmer
export const getTransactionById = async (farmerId: string, transactionId: string) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('farmer_id', farmerId)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};


//method for creating a new transaction for a farmer
export const createTransaction = async (farmerId: string, input: Record<string, any>) => {
  const { title, description, date, amount } = input;
  const category = String(input.category ?? '').toLowerCase();
  if (!title || !date || amount === undefined || amount === null || amount === '') {
    throw new Error('Missing required fields');
  }
  if (category !== 'income' && category !== 'expense') {
    throw new Error('Invalid category. Must be either "income" or "expense"');
  }
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      farmer_id: farmerId,
      title,
      description: description ?? '',
      date,
      amount,
      category,
    })
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};
//its for updating a transaction for a farmer
export const updateTransaction = async (
  farmerId: string,
  transactionId: string,
  input: Record<string, any>,
) => {
  const { data, error } = await supabase
    .from('transactions')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', transactionId)
    .eq('farmer_id', farmerId)
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};
//this is for deleting a transaction for a farmer
export const deleteTransaction = async (farmerId: string, transactionId: string) => {
  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('farmer_id', farmerId)
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};
