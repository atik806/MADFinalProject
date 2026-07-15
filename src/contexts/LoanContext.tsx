import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { defaultApplications, defaultActiveLoans } from '@/data/loans';

export type LoanStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'active' | 'completed';

export type TimelineEntry = {
  label: string;
  date: string;
  status: 'done' | 'current' | 'pending' | 'failed';
};

export type BankOfficer = {
  name: string;
  bank: string;
  branch: string;
};

export type LoanApplication = {
  id: string;
  title: string;
  date: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  amount: number;
  duration: string;
  purpose: string;
  installmentType: 'monthly' | 'seasonal';
  emi: number;
  timeline: TimelineEntry[];
  bankOfficer: BankOfficer;
};

export type ActiveLoan = {
  id: string;
  title: string;
  date: string;
  amount: number;
  duration: string;
  interest: string;
  emi: number;
  progress: number;
  installmentsPaid: number;
  installmentsTotal: number;
  nextPaymentDate: string;
  nextPaymentAmount: number;
};

type LoanContextType = {
  applications: LoanApplication[];
  activeLoans: ActiveLoan[];
  addApplication: (app: {
    title: string;
    amount: number;
    duration: string;
    purpose: string;
    installmentType: 'monthly' | 'seasonal';
  }) => void;
};

const LoanContext = createContext<LoanContextType | null>(null);

let nextAppId = 4;

export function LoanProvider({ children }: { children: ReactNode }) {
  const [applications, setApplications] = useState<LoanApplication[]>(defaultApplications);
  const [activeLoans] = useState<ActiveLoan[]>(defaultActiveLoans);

  const addApplication = useCallback((app: {
    title: string;
    amount: number;
    duration: string;
    purpose: string;
    installmentType: 'monthly' | 'seasonal';
  }) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).replace(/ /g, ' ');
    const id = `L-2024-00${nextAppId++}`;
    const months = parseInt(app.duration, 10);
    const emi = !isNaN(months) && months > 0
      ? Math.round(app.amount * (0.09 / 12) * Math.pow(1 + 0.09 / 12, months) / (Math.pow(1 + 0.09 / 12, months) - 1))
      : 0;
    setApplications((prev) => [
      {
        id,
        date: dateStr,
        status: 'pending',
        emi,
        timeline: [
          { label: 'Application Submitted', date: dateStr, status: 'done' },
          { label: 'Field Officer Verified', date: '', status: 'current' },
          { label: 'Under Bank Review', date: '', status: 'pending' },
          { label: 'Field Visit Scheduled', date: '', status: 'pending' },
          { label: 'Loan Decision', date: '', status: 'pending' },
          { label: 'Amount Disbursed', date: '', status: 'pending' },
        ],
        bankOfficer: {
          name: '—',
          bank: '—',
          branch: '—',
        },
        ...app,
      },
      ...prev,
    ]);
  }, []);

  return (
    <LoanContext.Provider value={{ applications, activeLoans, addApplication }}>
      {children}
    </LoanContext.Provider>
  );
}

export function useLoans() {
  const ctx = useContext(LoanContext);
  if (!ctx) throw new Error('useLoans must be used within LoanProvider');
  return ctx;
}
