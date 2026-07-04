import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/features/officials/shared/constants/theme';

type HeaderAction = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  accessibilityLabel?: string;
};

type ScreenHeaderProps = {
  title: string;
  actions?: HeaderAction[];
};

export function ScreenHeader({ title, actions }: ScreenHeaderProps) {
  return (
    <View style={headerStyles.header}>
      <View style={headerStyles.headerLeft}>
        <View style={headerStyles.logoIcon}>
          <Ionicons name="leaf" size={18} color="#FFFFFF" />
        </View>
        <Text style={headerStyles.logoText}>SOFOL</Text>
      </View>
      <Text style={headerStyles.headerTitle}>{title}</Text>
      <View style={headerStyles.headerRight}>
        {actions?.map((action, i) => (
          <Pressable
            key={i}
            style={headerStyles.headerIconBtn}
            onPress={action.onPress}
            accessibilityLabel={action.accessibilityLabel}
            accessibilityRole="button">
            <Ionicons name={action.icon} size={20} color={BrandColors.dashboard.textPrimary} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export const headerStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BrandColors.dashboard.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.dashboard.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 90,
  },
  logoIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: BrandColors.deepGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.deepGreen,
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.dashboard.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 90,
    justifyContent: 'flex-end',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: BrandColors.dashboard.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
