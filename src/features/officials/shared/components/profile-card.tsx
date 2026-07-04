import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/features/officials/shared/constants/theme';
import { borderRadius } from '@/features/officials/shared/constants/layout';

type ProfileCardProps = {
  name: string;
  email: string;
  roleLabel: string;
};

export function ProfileCard({ name, email, roleLabel }: ProfileCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
      <View style={[styles.avatar, { backgroundColor: colors.greenLight }]}>
        <Ionicons name="person" size={28} color="#FFFFFF" />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.dashboard.textPrimary }]}>{name}</Text>
        <Text style={[styles.email, { color: colors.dashboard.textSecondary }]}>{email}</Text>
        <View style={[styles.rolePill, { backgroundColor: colors.greenLight + '15' }]}>
          <Text style={[styles.rolePillText, { color: colors.greenLight }]}>{roleLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  email: {
    fontSize: 13,
    marginTop: 2,
  },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
