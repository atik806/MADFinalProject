import { api } from '@/config/api';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

const isFarmerRole = (role?: string) =>
  String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-') === 'farmer';

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

const mapActiveLoan = (row: any): ActiveLoan => {
  const emi = Number(row.emi) || 0;
  const installmentsTotal = Number(row.installments_total) || parseInt(String(row.duration ?? ''), 10) || 0;
  const installmentsPaid = Number(row.installments_paid) || 0;
  return {
    id: row.id,
    title: row.title ?? '',
    date: row.application_date
      ? new Date(row.application_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '',
    amount: Number(row.amount) || 0,
    duration: String(row.duration ?? ''),
    interest: '9%',
    emi,
    progress: Number(row.progress) || 0,
    installmentsPaid,
    installmentsTotal,
    nextPaymentDate: row.next_payment_date ?? '—',
    nextPaymentAmount: Number(row.next_payment_amount) || emi,
  };
};

type LoanContextType = {
  applications: LoanApplication[];
  activeLoans: ActiveLoan[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addApplication: (app: {
    title: string;
    amount: number;
    duration: string;
    purpose: string;
    installmentType: 'monthly' | 'seasonal';
  }) => Promise<void>;
  repayLoan: (loanId: string) => Promise<void>;
};

const LoanContext = createContext<LoanContextType | null>(null);

export function LoanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isFarmer = isFarmerRole(user?.role);

  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!isFarmerRole(user?.role)) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ data: any[] }>('/api/farmer/loans');
      const rows = res.data ?? [];
      setApplications(rows.map(mapLoanApplication));
      // mapActiveLoan needs the raw row (progress / installments_paid /
      // installments_total / next_payment_* are snake_case API fields that
      // mapLoanApplication doesn't carry over) — mapping the already-mapped
      // LoanApplication here silently zeroed repayment progress on every
      // reload, even after a successful repay.
      setActiveLoans(rows.filter((row) => row.status === 'approved').map(mapActiveLoan));
    } catch (e: any) {
      console.warn('Loan refresh failed:', e);
      setError(e?.message ?? 'Could not load loans.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isFarmer) return;
    const timer = setTimeout(() => void reload(), 0);
    return () => clearTimeout(timer);
  }, [isFarmer, reload]);

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
      await reload();
    },
    [reload],
  );

  const repayLoan = useCallback(
    async (loanId: string) => {
      await api.post(`/api/farmer/loans/${loanId}/repay`);
      await reload();
    },
    [reload],
  );

  return (
    <LoanContext.Provider value={{ applications, activeLoans, loading, error, reload, addApplication, repayLoan }}>
      {children}
    </LoanContext.Provider>
  );
}

export function useLoans() {
  const ctx = useContext(LoanContext);
  if (!ctx) throw new Error('useLoans must be used within LoanProvider');
  return ctx;
}
