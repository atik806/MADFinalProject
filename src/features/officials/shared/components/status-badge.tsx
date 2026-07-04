import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/features/officials/shared/constants/theme';

export type StatusType = 'verified' | 'pending' | 'rejected' | 'approved' | 'active' | 'under_review';

type StatusBadgeProps = {
  status: StatusType;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = useColors();

  const STATUS_CONFIG: Record<StatusType, { bg: string; text: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {

    verified: { bg: colors.userVerified, text: 'Verified', color: colors.userVerifiedText, icon: 'checkmark-circle' },
    pending: { bg: colors.userPending, text: 'Pending', color: colors.userPendingText, icon: 'time' },
    rejected: { bg: colors.userRejected, text: 'Rejected', color: colors.userRejectedText, icon: 'close-circle' },
    approved: { bg: colors.userVerified, text: 'Approved', color: colors.userVerifiedText, icon: 'checkmark-circle' },
    active: { bg: '#EFF6FF', text: 'Active', color: '#1D4ED8', icon: 'checkmark-circle' },
    under_review: { bg: colors.userPending, text: 'Under Review', color: colors.userPendingText, icon: 'time' },
  };

  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={12} color={cfg.color} />
      <Text style={[styles.text, { color: cfg.color }]}>{cfg.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});
