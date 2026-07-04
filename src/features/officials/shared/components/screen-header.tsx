import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/features/officials/shared/constants/theme';

type ScreenHeaderAction = {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  onPress?: () => void;
};

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ScreenHeaderAction[];
};

export function ScreenHeader({ title, subtitle, actions }: ScreenHeaderProps) {
  const colors = useColors();

  return (
    <View style={[styles.header, { backgroundColor: colors.dashboard.cardBg, borderBottomColor: colors.dashboard.border }]}>
      <View style={styles.leftSection}>
        <Text style={[styles.title, { color: colors.dashboard.textPrimary }]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: colors.dashboard.textSecondary }]}>{subtitle}</Text>}
      </View>
      {actions && actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map((action, i) => (
            <Pressable key={i} onPress={action.onPress} accessibilityLabel={action.accessibilityLabel} style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}>
              <Ionicons name={action.icon} size={20} color={colors.dashboard.textPrimary} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function RoleHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <View style={[styles.roleHeader, { backgroundColor: colors.deepGreen }]}>
      <Text style={styles.roleIcon}>ⴽ</Text>
      <Text style={styles.roleTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  leftSection: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionPressed: {
    opacity: 0.6,
  },
  roleHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  roleIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
