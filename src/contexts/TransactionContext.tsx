import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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

const defaultTransactions: Transaction[] = [
  { id: String(nextId++), title: 'Crop Sales', description: 'Boro rice harvest', date: '18 Jun 2024', amount: 45000, category: 'Income' },
  { id: String(nextId++), title: 'Fertilizer', description: 'Urea + TSP', date: '15 Jun 2024', amount: -8500, category: 'Expense' },
  { id: String(nextId++), title: 'Livestock', description: '2 goats sold', date: '10 Jun 2024', amount: 12000, category: 'Income' },
  { id: String(nextId++), title: 'Labor', description: 'Harvest workers', date: '8 Jun 2024', amount: -6000, category: 'Expense' },
  { id: String(nextId++), title: 'Seeds', description: 'Aus paddy seeds', date: '5 Jun 2024', amount: -4500, category: 'Expense' },
  { id: String(nextId++), title: 'Other', description: 'Equipment rental', date: '1 Jun 2024', amount: 3000, category: 'Income' },
];

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
