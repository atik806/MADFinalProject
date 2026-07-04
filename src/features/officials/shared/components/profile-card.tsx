import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/features/officials/shared/constants/theme';
import { shadows, borderRadius } from '@/features/officials/shared/constants/layout';

type ProfileCardProps = {
  name: string;
  email: string;
  roleLabel: string;
};

export function ProfileCard({ name, email, roleLabel }: ProfileCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={28} color="#FFFFFF" />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{roleLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.dashboard.cardBg,
    borderRadius: borderRadius.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...shadows.cardSubtle,
    borderWidth: 1,
    borderColor: BrandColors.dashboard.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: BrandColors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.dashboard.textPrimary,
  },
  email: {
    fontSize: 13,
    color: BrandColors.dashboard.textSecondary,
    marginTop: 2,
  },
  rolePill: {
    backgroundColor: BrandColors.greenLight + '15',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.greenLight,
  },
});
