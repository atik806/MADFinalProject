import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/features/officials/shared/constants/theme';
import { ScreenHeader } from '@/features/officials/shared/components/screen-header';

type PlaceholderScreenProps = {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
};

export function PlaceholderScreen({ title, subtitle, icon, iconColor = BrandColors.greenLight }: PlaceholderScreenProps) {
  return (
    <View style={styles.screen}>
      <ScreenHeader title={title} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.placeholder}>
          <Ionicons name={icon} size={48} color={iconColor} />
          <Text style={styles.heading}>{title}</Text>
          {subtitle && <Text style={styles.description}>{subtitle}</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.dashboard.bg,
  },
  container: { flex: 1 },
  content: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  placeholder: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: BrandColors.dashboard.textPrimary,
  },
  description: {
    fontSize: 14,
    color: BrandColors.dashboard.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
