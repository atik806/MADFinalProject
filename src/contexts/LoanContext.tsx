import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';

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
  loading: boolean;
  error: string | null;
  addApplication: (app: {
    title: string;
    amount: number;
    duration: string;
    purpose: string;
    installmentType: 'monthly' | 'seasonal';
  }) => Promise<void>;
  refreshApplications: () => Promise<void>;
  applyDetailTimeline: (loanId: string, row: any) => void;
};

const LoanContext = createContext<LoanContextType | null>(null);

const errorMessage = (err: unknown): string =>
  err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';

const formatDate = (value: string): string => {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, ' ');
};

const asApplicationStatus = (raw: unknown): LoanApplication['status'] => {
  switch (String(raw ?? '').toLowerCase()) {
    case 'under_review':
      return 'under_review';
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    default:
      return 'pending';
  }
};

// The 6-step timeline the UI renders. The backend seeds loan_timeline rows
// for the first three steps (Submitted / Under Review / Decision); the last
// three (disbursement-era) have no backend flow yet, so they render as
// not-reached placeholders. bankOfficer is '—' until a bank decision is
// recorded — inventing a name/bank would be fabricated data.
const timelineFor = (row: any): TimelineEntry[] => {
  const rows: any[] = Array.isArray(row?.loan_timeline) ? row.loan_timeline : [];
  const byStep = new Map(rows.map((r) => [Number(r.step), r]));
  const submittedAt = formatDate(String(row?.application_date ?? row?.created_at ?? ''));
  const decidedAt = row?.decision_at ? formatDate(String(row.decision_at)) : '';

  const steps: { label: string; step?: number; date: string }[] = [
    { label: 'Application Submitted', step: 1, date: submittedAt },
    { label: 'Field Officer Verified', date: row?.verified_at ? formatDate(String(row.verified_at)) : '' },
    { label: 'Under Bank Review', step: 2, date: row?.reviewed_at ? formatDate(String(row.reviewed_at)) : '' },
    { label: 'Field Visit Scheduled', date: '' },
    { label: 'Loan Decision', step: 3, date: decidedAt },
    { label: 'Amount Disbursed', date: '' },
  ];

  const status = asApplicationStatus(row?.status);
  const rejected = status === 'rejected';

  return steps.map((s) => {
    const t = s.step !== undefined ? byStep.get(s.step) : undefined;
    const completed = Boolean(t?.completed);
    if (completed) {
      return { label: s.label, date: s.date, status: rejected && s.step === 3 ? ('failed' as const) : ('done' as const) };
    }
    return { label: s.label, date: '', status: 'pending' as const };
  });
};

// Find the first not-yet-completed step so the detail screen's "current"
// indicator points at the live pipeline position.
const firstCurrentIndex = (timeline: TimelineEntry[]): number => {
  const idx = timeline.findIndex((entry) => entry.status === 'pending');
  return idx === -1 ? timeline.length - 1 : idx;
};

// The list endpoint returns rows without loan_timeline (only the detail
// endpoint embeds it), so list items get a status-derived timeline; opening
// the detail re-fetches with the real rows.
const mapLoanRow = (row: any): LoanApplication => {
  const hasEmbeddedTimeline = Array.isArray(row?.loan_timeline) && row.loan_timeline.length > 0;
  return {
    id: String(row.id),
    title: row.title ?? '',
    date: formatDate(String(row?.application_date ?? row?.created_at ?? '')),
    status: asApplicationStatus(row?.status),
    amount: Number(row.amount ?? 0),
    duration: row.duration ?? '',
    purpose: row.purpose ?? '',
    installmentType: row.installment_type === 'seasonal' ? 'seasonal' : 'monthly',
    emi: Number(row.emi ?? 0),
    timeline: hasEmbeddedTimeline
      ? timelineFor(row)
      : [
          { label: 'Application Submitted', date: formatDate(String(row?.application_date ?? row?.created_at ?? '')), status: 'done' as const },
          { label: 'Field Officer Verified', date: '', status: (row?.verification_status === 'verified' ? 'done' : 'pending') as TimelineEntry['status'] },
          { label: 'Under Bank Review', date: '', status: 'pending' as const },
          { label: 'Field Visit Scheduled', date: '', status: 'pending' as const },
          { label: 'Loan Decision', date: '', status: 'pending' as const },
          { label: 'Amount Disbursed', date: '', status: 'pending' as const },
        ],
    bankOfficer: {
      name: row?.decision_at ? 'Bank Officer' : '—',
      bank: '—',
      branch: '—',
    },
  };
};

export function LoanProvider({ children }: { children: ReactNode }) {
  // NOTE: activeLoans (disbursed loans with repayment progress) have no
  // backend flow yet — disbursement is deferred. The list stays empty rather
  // than being faked from application rows.
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [activeLoans] = useState<ActiveLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshApplications = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<any>('/api/farmer/loans');
      const rows = Array.isArray(res?.data) ? res.data : [];
      setApplications(rows.map(mapLoanRow));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const addApplication = useCallback(
    async (app: {
      title: string;
      amount: number;
      duration: string;
      purpose: string;
      installmentType: 'monthly' | 'seasonal';
    }) => {
      const res = await api.post<any>('/api/farmer/loans', {
        title: app.title,
        amount: app.amount,
        duration: app.duration,
        purpose: app.purpose,
        installmentType: app.installmentType,
        emi: 0,
        interest: 0,
      });
      // The server response is the created row; map it in so the list shows
      // the truth immediately. The timeline comes back from the detail view.
      if (res?.data?.id) {
        setApplications((prev) => [mapLoanRow(res.data), ...prev]);
      } else {
        await refreshApplications();
      }
    },
    [refreshApplications],
  );

  // Exposed for the detail screen to swap the status-derived timeline for
  // the server's real timeline rows once the specific loan is loaded.
  const [currentDetailIndex, setCurrentDetailIndex] = useState<number | null>(null);
  const applyDetailTimeline = useCallback((loanId: string, row: any) => {
    setApplications((prev) => prev.map((a) => (a.id === loanId ? { ...a, timeline: timelineFor(row) } : a)));
    setCurrentDetailIndex(firstCurrentIndex(timelineFor(row)));
  }, []);

  return (
    <LoanContext.Provider
      value={{
        applications,
        activeLoans,
        loading,
        error,
        addApplication,
        refreshApplications,
        applyDetailTimeline,
      }}
    >
      {children}
    </LoanContext.Provider>
  );
}

export function useLoans() {
  const ctx = useContext(LoanContext);
  if (!ctx) throw new Error('useLoans must be used within LoanProvider');
  return ctx;
}
