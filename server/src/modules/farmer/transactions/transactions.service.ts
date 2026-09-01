import { supabase } from '../../../config/supabase';
import {
  optionalText,
  requireSignedAmount,
  requireText,
  requireTransactionCategory,
  requireTransactionDate,
  requireUuid,
} from '../validation';

// Farmer transaction workflow. farmer_id is ALWAYS derived from the
// authenticated user (never from the client payload) and every read/update/
// delete is scoped by it, so a farmer can only touch their own transactions.

export interface TransactionInput {
  title?: unknown;
  description?: unknown;
  date?: unknown;
  amount?: unknown;
  category?: unknown;
}

// Columns a farmer may update. id/farmer_id/created_at are never client-
// writable; updated_at is stamped server-side.
const UPDATABLE_COLUMNS = ['title', 'description', 'date', 'amount', 'category'] as const;

// list: all transactions of the authenticated farmer, newest first.
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

// get by id — ownership enforced via farmer_id scoping. A missing row and a
// foreign farmer's row are indistinguishable (both 404).
export const getTransactionById = async (farmerId: string, transactionId: string) => {
  requireUuid(transactionId, 'Transaction id');
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('farmer_id', farmerId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Transaction not found');
  }
  return data;
};

// create — validates required fields, the income/expense category and the
// signed-amount convention (income > 0, expense < 0) before inserting.
export const createTransaction = async (farmerId: string, input: TransactionInput) => {
  const title = requireText(input.title, 'title', 255);
  const description = optionalText(input.description, 'description', 1000);
  const date = requireTransactionDate(input.date);
  const category = requireTransactionCategory(input.category);
  const amount = requireSignedAmount(input.amount, category);

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      farmer_id: farmerId,
      title,
      description,
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

// update — only whitelisted columns, validated with the same rules as create.
// A category change re-validates the amount against the new category.
export const updateTransaction = async (
  farmerId: string,
  transactionId: string,
  input: TransactionInput,
) => {
  requireUuid(transactionId, 'Transaction id');

  // Load the existing row first (ownership-scoped) so partial updates can be
  // validated against the merged result.
  const { data: existing, error: loadError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('farmer_id', farmerId)
    .maybeSingle();
  if (loadError) {
    throw new Error(loadError.message);
  }
  if (!existing) {
    throw new Error('Transaction not found');
  }

  const merged = { ...existing, ...sanitizeUpdatable(input) };
  const title = requireText(merged.title, 'title', 255);
  const description = optionalText(merged.description, 'description', 1000);
  const date = requireTransactionDate(merged.date);
  const category = requireTransactionCategory(merged.category);
  const amount = requireSignedAmount(merged.amount, category);

  const { data, error } = await supabase
    .from('transactions')
    .update({
      title,
      description,
      date,
      amount,
      category,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .eq('farmer_id', farmerId)
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

// delete — ownership-scoped. Returns the deleted row so the caller can 404
// when nothing matched.
export const deleteTransaction = async (farmerId: string, transactionId: string) => {
  requireUuid(transactionId, 'Transaction id');
  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('farmer_id', farmerId)
    .select()
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Transaction not found');
  }
  return data;
};

// Keeps only whitelisted updatable columns from the client payload.
const sanitizeUpdatable = (input: TransactionInput): Partial<TransactionInput> => {
  const cleaned: Record<string, unknown> = {};
  for (const column of UPDATABLE_COLUMNS) {
    if (input[column] !== undefined) {
      cleaned[column] = input[column];
    }
  }
  return cleaned as Partial<TransactionInput>;
};
