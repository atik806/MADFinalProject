import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { api } from '@/config/api';

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

const buildTimeline = (status: string): TimelineEntry[] => {
  const done = (s: string) =>
    s === 'approved' || s === 'active' || s === 'completed'
      ? 'done'
      : s === 'rejected'
        ? 'failed'
        : 'pending';
  return [
    { label: 'Application Submitted', date: '', status: 'done' },
    { label: 'Under Review', date: '', status: status === 'pending' ? 'current' : done(status) },
    {
      label: 'Approved',
      date: '',
      status:
        status === 'approved' || status === 'active' || status === 'completed'
          ? 'done'
          : status === 'rejected'
            ? 'failed'
            : 'pending',
    },
    { label: 'Disbursed', date: '', status: status === 'active' || status === 'completed' ? 'done' : 'pending' },
  ];
};

const mapLoanApplication = (row: any): LoanApplication => {
  const status = (row.status ?? 'pending') as LoanApplication['status'];
  return {
    id: row.id,
    title: row.title ?? '',
    date: row.application_date
      ? new Date(row.application_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '',
    status,
    amount: Number(row.amount) || 0,
    duration: String(row.duration ?? ''),
    purpose: row.purpose ?? '',
    installmentType: row.installment_type === 'seasonal' ? 'seasonal' : 'monthly',
    emi: Number(row.emi) || 0,
    timeline: buildTimeline(status),
    bankOfficer: { name: '—', bank: '—', branch: '—' },
  };
};

const mapActiveLoan = (row: any): ActiveLoan => ({
  id: row.id,
  title: row.title ?? '',
  date: row.application_date
    ? new Date(row.application_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '',
  amount: Number(row.amount) || 0,
  duration: String(row.duration ?? ''),
  interest: '9%',
  emi: Number(row.emi) || 0,
  progress: 0,
  installmentsPaid: 0,
  installmentsTotal: Number(row.duration) || 0,
  nextPaymentDate: '—',
  nextPaymentAmount: Number(row.emi) || 0,
});

type LoanContextType = {
  applications: LoanApplication[];
  activeLoans: ActiveLoan[];
  loading: boolean;
  addApplication: (app: {
    title: string;
    amount: number;
    duration: string;
    purpose: string;
    installmentType: 'monthly' | 'seasonal';
  }) => Promise<void>;
};

const LoanContext = createContext<LoanContextType | null>(null);

export function LoanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isFarmer = user?.role === 'farmer';

  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isFarmer) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get<{ data: any[] }>('/api/farmer/loans');
        if (cancelled) return;
        const apps = (res.data ?? []).map(mapLoanApplication);
        setApplications(apps);
        setActiveLoans(
          apps.filter((a) => a.status === 'approved').map(mapActiveLoan),
        );
      } catch {
        if (!cancelled) setApplications([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isFarmer, user]);

  const addApplication = useCallback(
    async (app: { title: string; amount: number; duration: string; purpose: string; installmentType: 'monthly' | 'seasonal' }) => {
      const months = parseInt(app.duration, 10);
      const r = 9 / 12 / 100;
      const emi =
        !isNaN(months) && months > 0
          ? Math.round((app.amount * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1))
          : 0;
      await api.post('/api/farmer/loans', {
        title: app.title,
        amount: app.amount,
        duration: app.duration,
        purpose: app.purpose,
        installment_type: app.installmentType,
        emi,
      });
      const res = await api.get<{ data: any[] }>('/api/farmer/loans');
      const apps = (res.data ?? []).map(mapLoanApplication);
      setApplications(apps);
      setActiveLoans(
        apps.filter((a) => a.status === 'approved').map(mapActiveLoan),
      );
    },
    [],
  );

  return (
    <LoanContext.Provider value={{ applications, activeLoans, loading, addApplication }}>
      {children}
    </LoanContext.Provider>
  );
}

export function useLoans() {
  const ctx = useContext(LoanContext);
  if (!ctx) throw new Error('useLoans must be used within LoanProvider');
  return ctx;
}
