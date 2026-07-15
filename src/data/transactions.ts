import type { Transaction } from '@/contexts/TransactionContext';

export const defaultTransactions: Transaction[] = [
  { id: '1', title: 'Crop Sales', description: 'Boro rice harvest', date: '18 Jun 2024', amount: 45000, category: 'Income' },
  { id: '2', title: 'Fertilizer', description: 'Urea + TSP', date: '15 Jun 2024', amount: -8500, category: 'Expense' },
  { id: '3', title: 'Livestock', description: '2 goats sold', date: '10 Jun 2024', amount: 12000, category: 'Income' },
  { id: '4', title: 'Labor', description: 'Harvest workers', date: '8 Jun 2024', amount: -6000, category: 'Expense' },
  { id: '5', title: 'Seeds', description: 'Aus paddy seeds', date: '5 Jun 2024', amount: -4500, category: 'Expense' },
  { id: '6', title: 'Other', description: 'Equipment rental', date: '1 Jun 2024', amount: 3000, category: 'Income' },
];

export const categories = ['Income', 'Expense'] as const;
