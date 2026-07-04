import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ActionCard } from '@/features/officials/shared/components/action-card';
import { BarChart } from '@/features/officials/shared/components/charts/bar-chart';
import { DonutChart } from '@/features/officials/shared/components/charts/donut-chart';
import { LineChart } from '@/features/officials/shared/components/charts/line-chart';
import { StatCard } from '@/features/officials/shared/components/stat-card';
import { ChartLegend } from '@/features/officials/shared/components/chart-legend';
import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { useColors } from '@/features/officials/shared/constants/theme';
import { contentMaxWidthWide } from '@/features/officials/shared/constants/layout';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const isCompact = width < 480;
  const isTablet = width >= 768;

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

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
    { label: 'Apr', values: [{ key: 'approved' as const, value: 45, color: colors.greenLight }, { key: 'pending' as const, value: 20, color: '#F59E0B' }] },
    { label: 'May', values: [{ key: 'approved' as const, value: 62, color: colors.greenLight }, { key: 'pending' as const, value: 15, color: '#F59E0B' }] },
    { label: 'Jun', values: [{ key: 'approved' as const, value: 78, color: colors.greenLight }, { key: 'pending' as const, value: 12, color: '#F59E0B' }] },
  ];

  const creditData = [
    { label: 'Low Risk', value: 42, color: '#22C55E' },
    { label: 'Medium', value: 35, color: '#F59E0B' },
    { label: 'High Risk', value: 23, color: '#EF4444' },
  ];

  const actions = [
    { icon: 'people' as const, iconBg: colors.blueLight, title: 'User Management', route: '/officials/(admin)/users' },
    { icon: 'document-text' as const, iconBg: colors.greenLight, title: 'Reports', route: '/officials/(admin)/reports' },
    { icon: 'settings' as const, iconBg: '#8B5CF6', title: 'System Config', route: '/officials/(admin)/settings' },
    { icon: 'document-lock' as const, iconBg: '#F59E0B', title: 'Audit Logs', route: '/officials/(admin)/audit-logs' },
  ];

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.dashboard.bg }]}>
        <ScreenHeader title="Admin Dashboard" />
        <View style={styles.loadingContainer}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.dashboard.cardBg }]}>
              <ActivityIndicator color={colors.greenLight} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.dashboard.bg }]}>
      <ScreenHeader
        title="Admin Dashboard"
        actions={[{ icon: 'notifications-outline', accessibilityLabel: 'Notifications', onPress: () => router.push('/view/Notifications/notifications' as unknown as any) }]}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.greenLight} />}>
        <LinearGradient
          colors={colors.purpleGradient}
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

        <View style={[styles.chartCard, { backgroundColor: colors.dashboard.cardBg }]}>
          <Text style={[styles.chartTitle, { color: colors.dashboard.textPrimary }]}>Farmer Registration Growth</Text>
          <LineChart data={registrationData} />
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.dashboard.cardBg }]}>
          <Text style={[styles.chartTitle, { color: colors.dashboard.textPrimary }]}>Loan Analytics</Text>
          <ChartLegend items={[{ label: 'Approved', color: colors.greenLight }, { label: 'Pending', color: '#F59E0B' }]} />
          <BarChart data={loanData} />
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.dashboard.cardBg }]}>
          <Text style={[styles.chartTitle, { color: colors.dashboard.textPrimary }]}>Credit Distribution</Text>
          <DonutChart data={creditData} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.dashboard.textPrimary }]}>System Actions</Text>
        </View>
        <View style={[styles.actionsGrid, isCompact && styles.actionsGridCompact]}>
          {actions.map((action, i) => (
            <ActionCard
              key={i}
              icon={action.icon}
              iconBg={action.iconBg}
              title={action.title}
              onPress={() => router.push(action.route as unknown as any)}
            />
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 16, maxWidth: contentMaxWidthWide, alignSelf: 'center', width: '100%' },
  loadingContainer: { flex: 1, padding: 16, gap: 12 },
  skeletonCard: { height: 100, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  heroCard: { borderRadius: 20, marginBottom: 16, overflow: 'hidden' },
  heroHeader: { marginBottom: 4 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  heroBadgeText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5, textTransform: 'uppercase' },
  heroTitle: { fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  heroSubtitle: { fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 20 },
  heroStatsGrid: { gap: 12 },
  heroStatsRow: { flexDirection: 'row', gap: 12 },
  chartCard: { borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  chartTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  sectionHeader: { marginTop: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  actionsGrid: { flexDirection: 'row', gap: 12 },
  actionsGridCompact: { flexWrap: 'wrap' },
});
