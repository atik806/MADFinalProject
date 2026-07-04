import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/features/officials/shared/constants/theme';

const STATUS_CONFIG = {
  verified: { bg: BrandColors.userVerified, text: 'Verified', color: BrandColors.userVerifiedText, icon: 'checkmark-circle' as const },
  pending: { bg: BrandColors.userPending, text: 'Pending', color: BrandColors.userPendingText, icon: 'time' as const },
  rejected: { bg: BrandColors.userRejected, text: 'Rejected', color: BrandColors.userRejectedText, icon: 'close-circle' as const },
};

type StatusBadgeProps = {
  status: keyof typeof STATUS_CONFIG;
};

export function StatusBadge({ status }: StatusBadgeProps) {
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
