import type { Notification } from '@/contexts/NotificationContext';

export const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    icon: 'checkmark-circle',
    color: '#16A34A',
    title: 'Loan Approved!',
    time: '2h ago',
    description: 'Your application L-2024-004 for ৳60,000 has been approved by Sonali Bank.',
    read: false,
  },
  {
    id: '2',
    icon: 'trending-up',
    color: '#2563EB',
    title: 'Credit Score Updated',
    time: '1d ago',
    description: 'Your score increased from 710 to 720. Great financial discipline!',
    read: false,
  },
  {
    id: '3',
    icon: 'shield-checkmark',
    color: '#7C3AED',
    title: 'Profile Verified',
    time: '3d ago',
    description: 'Your farm details have been verified by Field Officer Khorshed Alam.',
    read: true,
  },
  {
    id: '4',
    icon: 'document-text',
    color: '#F59E0B',
    title: 'Document Required',
    time: '5d ago',
    description: 'Please upload your land deed to complete your loan application.',
    read: true,
  },
];
