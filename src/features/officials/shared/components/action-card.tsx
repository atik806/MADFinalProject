import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/features/officials/shared/constants/theme';

type ActionCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  title: string;
  onPress?: () => void;
};

export function ActionCard({ icon, iconBg, title, onPress }: ActionCardProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.dashboard.cardBg },
        pressed && styles.cardPressed,
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg + '20' }]}>
        <Ionicons name={icon} size={22} color={iconBg} />
      </View>
      <Text style={[styles.title, { color: colors.dashboard.textPrimary }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.8,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
});
