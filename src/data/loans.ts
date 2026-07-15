import type { LoanApplication, ActiveLoan } from '@/contexts/LoanContext';

export const defaultApplications: LoanApplication[] = [
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

export const defaultActiveLoans: ActiveLoan[] = [
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

export const amountPresets = [25000, 50000, 75000, 100000];

export const purposes = [
  'Boro Rice Cultivation',
  'Aus/Aman Cultivation',
  'Vegetable Farming',
  'Fish/Shrimp Farming',
  'Livestock Purchase',
  'Irrigation System',
  'Farm Equipment',
  'Other',
];

export const durationPresets = [3, 6, 9, 12];

export const statusConfig: Record<string, { labelKey: string; color: string; bg: string }> = {
  pending: { labelKey: 'pending', color: '#D97706', bg: '#FFFBEB' },
  under_review: { labelKey: 'underReview', color: '#2563EB', bg: '#EFF6FF' },
  approved: { labelKey: 'approved', color: '#16A34A', bg: '#ECFDF5' },
  rejected: { labelKey: 'rejected', color: '#DC2626', bg: '#FEF2F2' },
};

export const labelMap: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const statusColors: Record<string, { color: string; bg: string }> = {
  pending: { color: '#D97706', bg: '#FFFBEB' },
  under_review: { color: '#2563EB', bg: '#EFF6FF' },
  approved: { color: '#16A34A', bg: '#ECFDF5' },
  rejected: { color: '#DC2626', bg: '#FEF2F2' },
};

export type FilterTab = 'all' | 'pending' | 'approved' | 'rejected' | 'active';

export const LOAN_MANAGEMENT_FILTERS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'active', label: 'Active' },
];
