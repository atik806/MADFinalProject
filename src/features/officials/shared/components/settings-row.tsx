import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { BrandColors } from '@/features/officials/shared/constants/theme';

type SettingsRowProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
};

export function SettingsRow({ icon, label, value, showSwitch, switchValue, onSwitchChange }: SettingsRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {icon && <Ionicons name={icon} size={20} color={BrandColors.dashboard.textPrimary} />}
        <Text style={styles.label}>{label}</Text>
      </View>
      {showSwitch ? (
        <Switch
          trackColor={{ false: '#E5E7EB', true: BrandColors.greenLight + '60' }}
          thumbColor={BrandColors.greenLight}
          value={switchValue}
          onValueChange={onSwitchChange}
        />
      ) : value ? (
        <Text style={styles.value}>{value}</Text>
      ) : null}
    </View>
  );
}

export const settingsCardStyles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.dashboard.cardBg,
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: BrandColors.dashboard.border,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
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
    color: BrandColors.dashboard.textPrimary,
  },
  value: {
    fontSize: 14,
    color: BrandColors.dashboard.textSecondary,
    fontWeight: '500',
  },
});
