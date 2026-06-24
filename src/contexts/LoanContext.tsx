import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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

const defaultApplications: LoanApplication[] = [
  {
    id: 'L-2024-001',
    title: 'Boro Rice Cultivation',
    date: '15 Jun 2024',
    status: 'pending',
    amount: 75000,
    duration: '6 months',
    purpose: 'Boro Rice Cultivation',
    installmentType: 'monthly',
    emi: 12500,
    timeline: [
      { label: 'Application Submitted', date: '15 Jun 2024', status: 'done' },
      { label: 'Field Officer Verified', date: '16 Jun 2024', status: 'done' },
      { label: 'Under Bank Review', date: '17 Jun 2024', status: 'current' },
      { label: 'Field Visit Scheduled', date: '', status: 'pending' },
      { label: 'Loan Decision', date: '', status: 'pending' },
      { label: 'Amount Disbursed', date: '', status: 'pending' },
    ],
    bankOfficer: {
      name: 'Habibur Rahman',
      bank: 'Sonali Bank',
      branch: 'Bhola Branch',
    },
  },
  {
    id: 'L-2024-002',
    title: 'Shrimp Farm Expansion',
    date: '12 Jun 2024',
    status: 'under_review',
    amount: 50000,
    duration: '12 months',
    purpose: 'Fish/Shrimp Farming',
    installmentType: 'seasonal',
    emi: 4500,
    timeline: [
      { label: 'Application Submitted', date: '12 Jun 2024', status: 'done' },
      { label: 'Field Officer Verified', date: '13 Jun 2024', status: 'done' },
      { label: 'Under Bank Review', date: '14 Jun 2024', status: 'done' },
      { label: 'Field Visit Scheduled', date: '20 Jun 2024', status: 'current' },
      { label: 'Loan Decision', date: '', status: 'pending' },
      { label: 'Amount Disbursed', date: '', status: 'pending' },
    ],
    bankOfficer: {
      name: 'Khorshed Alam',
      bank: 'Janata Bank',
      branch: 'Char Fasson Branch',
    },
  },
  {
    id: 'L-2024-003',
    title: 'Jute Seeds Purchase',
    date: '8 Jun 2024',
    status: 'rejected',
    amount: 30000,
    duration: '4 months',
    purpose: 'Other',
    installmentType: 'monthly',
    emi: 7800,
    timeline: [
      { label: 'Application Submitted', date: '8 Jun 2024', status: 'done' },
      { label: 'Field Officer Verified', date: '9 Jun 2024', status: 'done' },
      { label: 'Under Bank Review', date: '10 Jun 2024', status: 'done' },
      { label: 'Field Visit Scheduled', date: '12 Jun 2024', status: 'done' },
      { label: 'Loan Decision', date: '14 Jun 2024', status: 'failed' },
      { label: 'Amount Disbursed', date: '', status: 'pending' },
    ],
    bankOfficer: {
      name: 'Habibur Rahman',
      bank: 'Sonali Bank',
      branch: 'Bhola Branch',
    },
  },
];

const defaultActiveLoans: ActiveLoan[] = [
  {
    id: 'L-2024-004',
    title: 'Vegetable Irrigation',
    date: '5 Jun 2024',
    amount: 60000,
    duration: '8 months',
    interest: '8.5%',
    emi: 7500,
    progress: 25,
    installmentsPaid: 2,
    installmentsTotal: 8,
    nextPaymentDate: '15 Jul 2024',
    nextPaymentAmount: 7500,
  },
];

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
