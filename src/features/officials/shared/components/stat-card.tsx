import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/features/officials/shared/constants/theme';
import { borderRadius } from '@/features/officials/shared/constants/layout';

type StatCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg?: string;
  value: string;
  label: string;
  sub?: string;
  trend?: string;
  trendLabel?: string;
  hero?: boolean;
};

export function StatCard({ icon, iconBg, value, label, sub, trend, trendLabel, hero }: StatCardProps) {
  const colors = useColors();
  const isPositive = trend && !trend.startsWith('-');

  if (hero) {
    return (
      <View style={[heroStyles.card, { borderRadius: borderRadius.md }]}>
        <View style={[heroStyles.iconWrap, { backgroundColor: iconBg ? iconBg + '30' : 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name={icon} size={20} color="#FFFFFF" />
        </View>
        <View style={heroStyles.info}>
          <Text style={heroStyles.value}>{value}</Text>
          <Text style={heroStyles.label}>{label}</Text>
          {trend && (
            <View style={heroStyles.trendRow}>
              <Text style={[heroStyles.trend, isPositive ? heroStyles.trendUp : heroStyles.trendDown]}>
                {trend}
              </Text>
              {trendLabel && <Text style={heroStyles.trendLabel}>{trendLabel}</Text>}
            </View>
          )}
          {sub && <Text style={heroStyles.sub}>{sub}</Text>}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.dashboard.cardBg }]}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg ? iconBg + '20' : colors.dashboard.border }]}>
        <Ionicons name={icon} size={22} color={iconBg || colors.dashboard.textSecondary} />
      </View>
      <Text style={[styles.value, { color: colors.dashboard.textPrimary }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{label}</Text>
      {trend && (
        <Text style={[styles.trend, { color: isPositive ? colors.dashboard.greenUp : colors.dashboard.redDown }]}>
          <Ionicons name={isPositive ? 'arrow-up' : 'arrow-down'} size={12} color={isPositive ? colors.dashboard.greenUp : colors.dashboard.redDown} />
          {' '}{trend}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  trend: {
    fontSize: 12,
    fontWeight: '600',
  },
});

const heroStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  trend: {
    fontSize: 11,
    fontWeight: '700',
  },
  trendUp: {
    color: '#34D399',
  },
  trendDown: {
    color: '#F87171',
  },
  trendLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },
  sub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
});
