import { GlassView } from 'expo-glass-effect';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { BrandColors } from '@/features/officials/shared/constants/theme';

const canUseGlass = Platform.OS === 'ios' || Platform.OS === 'android';

export function GlassCard({ children, style, ...props }: ViewProps) {
  if (canUseGlass) {
    return (
      <GlassView
        glassEffectStyle="regular"
        tintColor="#FFFFFF"
        style={[styles.base, styles.nativeGlass, style]}
        {...props}>
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[styles.base, styles.fallback, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
  },
  nativeGlass: {
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: BrandColors.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
});
