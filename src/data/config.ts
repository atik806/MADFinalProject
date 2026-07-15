import type { Ionicons } from '@expo/vector-icons';

export const USER_CARD_AVATAR_COLORS = [
  '#047857', '#1D4ED8', '#7C3AED', '#B45309', '#BE185D',
  '#0D9488', '#4F46E5', '#C026D3', '#CA8A04', '#DC2626',
];

export function getVisitStatusConfig(status: string) {
  switch (status) {
    case 'scheduled':
      return { bg: '#DBEAFE', color: '#1E40AF', icon: 'calendar' as const, label: 'Scheduled' };
    case 'in-progress':
      return { bg: '#FEF3C7', color: '#92400E', icon: 'time' as const, label: 'In Progress' };
    case 'completed':
      return { bg: '#D1FAE5', color: '#065F46', icon: 'checkmark-circle' as const, label: 'Completed' };
    case 'cancelled':
      return { bg: '#FEE2E2', color: '#991B1B', icon: 'close-circle' as const, label: 'Cancelled' };
    default:
      return { bg: '#F3F4F6', color: '#6B7280', icon: 'remove-circle' as const, label: status };
  }
}

export function getLoanStatusInfo(status: string) {
  switch (status) {
    case 'pending':
      return { label: 'Pending Verification', bg: '#FEF3C7', color: '#92400E', icon: 'time' as const };
    case 'under_review':
      return { label: 'Under Review', bg: '#DBEAFE', color: '#1E40AF', icon: 'eye' as const };
    case 'approved':
      return { label: 'Verified', bg: '#D1FAE5', color: '#065F46', icon: 'checkmark-circle' as const };
    case 'rejected':
      return { label: 'Rejected', bg: '#FEE2E2', color: '#991B1B', icon: 'close-circle' as const };
    default:
      return { label: status, bg: '#F3F4F6', color: '#6B7280', icon: 'remove-circle' as const };
  }
}
