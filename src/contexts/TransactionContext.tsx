import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import type { ApiResponse, TransactionRow } from '../lib/api-types';

export type Transaction = {
  id: string;
  title: string;
  description: string;
  date: string;
  amount: number;
  category: string;
};

type TransactionContextType = {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  refreshTransactions: () => Promise<void>;
};

const TransactionContext = createContext<TransactionContextType | null>(null);

// Backend rows are snake_case; the UI types are camelCase. Amounts follow the
// backend sign convention (income positive, expense negative) which is the
// same convention the screen math already uses.
const mapTransaction = (row: TransactionRow): Transaction => ({
  id: String(row.id),
  title: row.title ?? '',
  description: row.description ?? '',
  date: row.date ?? '',
  amount: Number(row.amount ?? 0),
  category: Number(row.amount) < 0 ? 'Expense' : 'Income',
});

const errorMessage = (err: unknown): string =>
  err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTransactions = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<ApiResponse<TransactionRow[]>>('/api/farmer/transactions');
      const rows = Array.isArray(res?.data) ? res.data : [];
      setTransactions(rows.map(mapTransaction));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const addTransaction = useCallback(
    async (tx: Omit<Transaction, 'id'>) => {
      // Optimistic UI: the row appears immediately with a temporary id and is
      // reconciled (or rolled back) when the server responds.
      const tempId = `temp-${Date.now()}`;
      const optimistic: Transaction = { ...tx, id: tempId };
      setTransactions((prev) => [optimistic, ...prev]);
      try {
        const res = await api.post<ApiResponse<TransactionRow>>('/api/farmer/transactions', {
          title: tx.title,
          description: tx.description,
          date: tx.date,
          amount: tx.amount,
          category: tx.amount < 0 ? 'expense' : 'income',
        });
        const created = mapTransaction((res?.data ?? {}) as TransactionRow);
        setTransactions((prev) => prev.map((t) => (t.id === tempId ? created : t)));
      } catch (err) {
        setTransactions((prev) => prev.filter((t) => t.id !== tempId));
        throw err instanceof ApiError ? err : new Error(errorMessage(err));
      }
    },
    [],
  );

  const removeTransaction = useCallback(async (id: string) => {
    const snapshot = transactions;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.del(`/api/farmer/transactions/${id}`);
    } catch (err) {
      setTransactions(snapshot);
      throw err instanceof ApiError ? err : new Error(errorMessage(err));
    }
  }, [transactions]);

  return (
    <TransactionContext.Provider
      value={{ transactions, loading, error, addTransaction, removeTransaction, refreshTransactions }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionProvider');
  return ctx;
}
