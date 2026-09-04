import { api } from '@/config/api';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

const isFarmerRole = (role?: string) =>
  String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-') === 'farmer';

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
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
};

const TransactionContext = createContext<TransactionContextType | null>(null);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isFarmerRole(user?.role)) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ data: Transaction[] }>('/api/farmer/transactions');
      setTransactions(res.data ?? []);
    } catch (e: any) {
      console.warn('Transaction refresh failed:', e);
      setError(e?.message ?? 'Could not load transactions.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const addTransaction = useCallback(
    async (tx: Omit<Transaction, 'id'>) => {
      await api.post('/api/farmer/transactions', tx);
      await refresh();
    },
    [refresh],
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      await api.del(`/api/farmer/transactions/${id}`);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    },
    [],
  );

  return (
    <TransactionContext.Provider
      value={{ transactions, loading, error, addTransaction, removeTransaction, refresh, reload: refresh }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionProvider');
  return ctx;
}
