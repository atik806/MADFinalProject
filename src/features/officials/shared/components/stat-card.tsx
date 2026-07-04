import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/features/officials/shared/constants/theme';

type StatCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  value: string;
  label: string;
  trend?: string;
  trendLabel?: string;
  sub?: string;
  inline?: boolean;
  hero?: boolean;
};

export function StatCard({ icon, iconBg, value, label, trend, trendLabel, sub, inline, hero }: StatCardProps) {
  const isPositive = trend?.startsWith('+');

  if (hero) {
    return (
      <View style={styles.heroCard}>
        <View style={styles.heroIconRow}>
          <View style={[styles.heroIconCircle, { backgroundColor: iconBg + '30' }]}>
            <Ionicons name={icon} size={20} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.heroValue}>{value}</Text>
        <Text style={styles.heroLabel}>{label}</Text>
        {trend && (
          <View style={styles.heroTrendRow}>
            <Ionicons
              name={isPositive ? 'trending-up' : 'trending-down'}
              size={13}
              color={isPositive ? '#34D399' : '#F87171'}
            />
            <Text style={[styles.heroTrendText, { color: isPositive ? '#34D399' : '#F87171' }]}>
              {trend} {trendLabel}
            </Text>
          </View>
        )}
        {sub && <Text style={styles.heroSub}>{sub}</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.card, inline && styles.cardInline]}>
      <View style={[styles.iconCircle, { backgroundColor: iconBg + '18' }]}>
        <Ionicons name={icon} size={20} color={iconBg} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {trend && (
        <View style={styles.trendRow}>
          <Ionicons
            name={isPositive ? 'trending-up' : 'trending-down'}
            size={14}
            color={isPositive ? BrandColors.dashboard.greenUp : BrandColors.dashboard.redDown}
          />
          <Text
            style={[
              styles.trendText,
              { color: isPositive ? BrandColors.dashboard.greenUp : BrandColors.dashboard.redDown },
            ]}>
            {trend} {trendLabel}
          </Text>
        </View>
      )}
      {sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.dashboard.cardBg,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    flex: 1,
    minWidth: 140,
  },
  cardInline: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    shadowOpacity: 0,
    elevation: 0,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 100,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: BrandColors.dashboard.textPrimary,
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: BrandColors.dashboard.textSecondary,
    marginBottom: 8,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sub: {
    fontSize: 12,
    fontWeight: '500',
    color: BrandColors.dashboard.textSecondary,
    marginTop: 4,
  },
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flex: 1,
    minWidth: 120,
  },
  heroIconRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  heroIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  heroTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroTrendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroSub: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
});
