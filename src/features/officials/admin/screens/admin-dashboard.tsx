import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ActionCard } from '@/features/officials/shared/components/action-card';
import { BarChart } from '@/features/officials/shared/components/charts/bar-chart';
import { DonutChart } from '@/features/officials/shared/components/charts/donut-chart';
import { LineChart } from '@/features/officials/shared/components/charts/line-chart';
import { StatCard } from '@/features/officials/shared/components/stat-card';
import { ChartLegend } from '@/features/officials/shared/components/chart-legend';
import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { BrandColors } from '@/features/officials/shared/constants/theme';
import { contentMaxWidthWide } from '@/features/officials/shared/constants/layout';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isCompact = width < 480;
  const isTablet = width >= 768;

  const heroStats = [
    { icon: 'leaf' as const, iconBg: '#A78BFA', value: '510', label: 'Total Farmers', trend: '+48', trendLabel: 'this month' },
    { icon: 'wallet' as const, iconBg: '#60A5FA', value: '234', label: 'Total Loans', sub: '৳4.2 Crore total' },
    { icon: 'checkmark-circle' as const, iconBg: '#34D399', value: '72%', label: 'Approval Rate', trend: '+5%', trendLabel: 'vs last month' },
    { icon: 'people' as const, iconBg: '#F472B6', value: '89', label: 'Active Users', sub: 'Field + Bank Officers' },
  ];

  const registrationData = [
    { label: 'Jan', value: 120 },
    { label: 'Feb', value: 250 },
    { label: 'Mar', value: 380 },
    { label: 'Apr', value: 520 },
    { label: 'May', value: 480 },
    { label: 'Jun', value: 560 },
  ];

  const loanData = [
    { label: 'Apr', values: [{ key: 'approved', value: 45, color: BrandColors.greenLight }, { key: 'pending', value: 20, color: '#F59E0B' }] },
    { label: 'May', values: [{ key: 'approved', value: 62, color: BrandColors.greenLight }, { key: 'pending', value: 15, color: '#F59E0B' }] },
    { label: 'Jun', values: [{ key: 'approved', value: 78, color: BrandColors.greenLight }, { key: 'pending', value: 12, color: '#F59E0B' }] },
  ];

  const creditData = [
    { label: 'Low Risk', value: 42, color: '#22C55E' },
    { label: 'Medium', value: 35, color: '#F59E0B' },
    { label: 'High Risk', value: 23, color: '#EF4444' },
  ];

  const actions = [
    { icon: 'people' as const, iconBg: BrandColors.blueLight, title: 'User Management', route: 'users' as const },
    { icon: 'document-text' as const, iconBg: BrandColors.greenLight, title: 'Reports', route: 'reports' as const },
    { icon: 'settings' as const, iconBg: '#8B5CF6', title: 'System Config', route: 'settings' as const },
    { icon: 'document-lock' as const, iconBg: '#F59E0B', title: 'Audit Logs', route: 'settings' as const },
  ];

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Admin Dashboard"
        actions={[{ icon: 'notifications-outline', accessibilityLabel: 'Notifications' }]}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={BrandColors.purpleGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroCard, { padding: isTablet ? 32 : 24 }]}>
        <View style={styles.heroHeader}>
          <View style={styles.heroBadge}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeText}>{user?.name?.toUpperCase() ?? 'ADMINISTRATOR'}</Text>
          </View>
          <Text style={[styles.heroTitle, { fontSize: isTablet ? 32 : 26 }]}>SOFOL Platform</Text>
          <Text style={[styles.heroSubtitle, { fontSize: isTablet ? 14 : 13 }]}>Bangladesh Agri-FinTech · Powered by SOFOL</Text>
        </View>

        <View style={styles.heroDivider} />

        <View style={styles.heroStatsGrid}>
          <View style={styles.heroStatsRow}>
            <StatCard {...heroStats[0]} hero />
            <StatCard {...heroStats[1]} hero />
          </View>
          <View style={styles.heroStatsRow}>
            <StatCard {...heroStats[2]} hero />
            <StatCard {...heroStats[3]} hero />
          </View>
        </View>
      </LinearGradient>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Farmer Registration Growth</Text>
        <LineChart data={registrationData} />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Loan Analytics</Text>
        <ChartLegend items={[{ label: 'Approved', color: BrandColors.greenLight }, { label: 'Pending', color: '#F59E0B' }]} />
        <BarChart data={loanData} />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Credit Distribution</Text>
        <DonutChart data={creditData} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>System Actions</Text>
      </View>
      <View style={[styles.actionsGrid, isCompact && styles.actionsGridCompact]}>
        {actions.map((action, i) => (
          <ActionCard
            key={i}
            icon={action.icon}
            iconBg={action.iconBg}
            title={action.title}
            onPress={() => router.push(action.route as any)}
          />
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.dashboard.bg,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    maxWidth: contentMaxWidthWide,
    alignSelf: 'center',
    width: '100%',
  },
  heroCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroHeader: {
    marginBottom: 4,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 20,
  },
  heroStatsGrid: {
    gap: 12,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chartCard: {
    backgroundColor: BrandColors.dashboard.cardBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.dashboard.textPrimary,
    marginBottom: 12,
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.dashboard.textPrimary,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionsGridCompact: {
    flexWrap: 'wrap',
  },
});
