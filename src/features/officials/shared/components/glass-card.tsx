import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/features/officials/shared/constants/theme';

type GlassCardProps = {
  children: ReactNode;
  style?: Record<string, unknown>;
};

export function GlassCard({ children, style }: GlassCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
});
