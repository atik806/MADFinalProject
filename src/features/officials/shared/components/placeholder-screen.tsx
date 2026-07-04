import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/features/officials/shared/constants/theme';

type PlaceholderScreenProps = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
};

export function PlaceholderScreen({ title, subtitle, icon, iconColor }: PlaceholderScreenProps) {
  const colors = useColors();

  return (
    <View style={[styles.screen, { backgroundColor: colors.dashboard.bg }]}>
      {icon && (
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={48} color={iconColor || colors.greenLight} />
        </View>
      )}
      <Text style={[styles.title, { color: colors.dashboard.textPrimary }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.dashboard.textSecondary }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconWrap: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
});
