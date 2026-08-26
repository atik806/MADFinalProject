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
