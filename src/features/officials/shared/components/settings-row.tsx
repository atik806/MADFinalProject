import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useColors } from '@/features/officials/shared/constants/theme';

type SettingsRowProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
};

export function SettingsRow({ icon, label, value, showSwitch, switchValue, onSwitchChange }: SettingsRowProps) {
  const colors = useColors();

  return (
    <View style={[styles.row, { borderBottomColor: colors.dashboard.border }]}>
      <View style={styles.left}>
        {icon && <Ionicons name={icon} size={20} color={colors.dashboard.textPrimary} />}
        <Text style={[styles.label, { color: colors.dashboard.textPrimary }]}>{label}</Text>
      </View>
      {showSwitch ? (
        <Switch
          trackColor={{ false: colors.dashboard.border, true: colors.greenLight + '60' }}
          thumbColor={colors.greenLight}
          value={switchValue}
          onValueChange={onSwitchChange}
        />
      ) : value ? (
        <Text style={[styles.value, { color: colors.dashboard.textSecondary }]}>{value}</Text>
      ) : null}
    </View>
  );
}

export const settingsCardStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
  },
});
