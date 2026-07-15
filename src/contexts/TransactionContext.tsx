import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { defaultTransactions } from '@/data/transactions';

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
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  removeTransaction: (id: string) => void;
};

const TransactionContext = createContext<TransactionContextType | null>(null);

let nextId = 1;

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(defaultTransactions);

  const addTransaction = useCallback((tx: Omit<Transaction, 'id'>) => {
    setTransactions((prev) => [{ id: String(nextId++), ...tx }, ...prev]);
  }, []);

  const removeTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <TransactionContext.Provider value={{ transactions, addTransaction, removeTransaction }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionProvider');
  return ctx;
}
