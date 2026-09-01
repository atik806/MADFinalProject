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
import { api } from '@/lib/api';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [registrationData, setRegistrationData] = useState<{ label: string; value: number }[]>([]);
  const [loanData, setLoanData] = useState<{ label: string; values: { key: string; value: number; color: string }[] }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isCompact = width < 480;
  const isTablet = width >= 768;

  const loadDashboard = useCallback(async () => {
    setLoadError(null);
    try {
      const [statsRes, trendRes, analyticsRes] = await Promise.all([
        api.get<any>('/api/admin/dashboard/stats'),
        api.get<any>('/api/admin/dashboard/registration-trend?months=6'),
        api.get<any>('/api/admin/dashboard/loan-analytics?months=6'),
      ]);
      setStats(statsRes?.data ?? null);
      setRegistrationData((trendRes?.data ?? []).map((p: any) => ({ label: p.label, value: p.value })));
      setLoanData(
        (analyticsRes?.data ?? []).map((p: any) => ({
          label: p.label,
          values: [
            { key: 'approved', value: p.approved, color: colors.greenLight },
            { key: 'pending', value: p.pending, color: '#F59E0B' },
          ],
        })),
      );
    } catch (err: any) {
      setLoadError(err?.message ?? 'Could not load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  }, [colors.greenLight]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard().finally(() => setRefreshing(false));
  }, [loadDashboard]);

  // Real platform statistics from /api/admin/dashboard/stats. The hero cards
  // show total farmers, total loans, approval rate, and active users
  // (field + bank officers with active status).
  const totalLoans = Number(stats?.totalLoans ?? 0);
  const approvedLoans = Number(stats?.approvedLoans ?? 0);
  const approvalRate = totalLoans > 0 ? Math.round((approvedLoans / totalLoans) * 100) : 0;
  const activeOfficers = Number(stats?.activeFieldOfficers ?? 0) + Number(stats?.activeBankOfficers ?? 0);

  const heroStats = [
    { icon: 'leaf' as const, iconBg: '#A78BFA', value: String(stats?.totalFarmers ?? 0), label: 'Total Farmers' },
    { icon: 'wallet' as const, iconBg: '#60A5FA', value: String(totalLoans), label: 'Total Loans' },
    { icon: 'checkmark-circle' as const, iconBg: '#34D399', value: `${approvalRate}%`, label: 'Approval Rate' },
    { icon: 'people' as const, iconBg: '#F472B6', value: String(activeOfficers), label: 'Active Users', sub: 'Field + Bank Officers' },
  ];

  // Risk distribution is derived from verified/unverified farmer counts —
  // the closest schema-backed aggregate to the original Low/Medium/High card.
  const creditData = [
    { label: 'Verified', value: Number(stats?.verifiedFarmers ?? 0), color: '#22C55E' },
    { label: 'Pending', value: Number(stats?.pendingFarmers ?? 0), color: '#F59E0B' },
    { label: 'Rejected Loans', value: Number(stats?.rejectedLoans ?? 0), color: '#EF4444' },
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
        {loadError ? (
          <View style={[styles.chartCard, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.redDown }]}>
            <Text style={[styles.chartTitle, { color: colors.dashboard.redDown }]}>Could not load statistics</Text>
            <Text style={{ color: colors.dashboard.textSecondary }}>{loadError}</Text>
            <Text style={{ color: colors.dashboard.textSecondary, marginTop: 4 }}>Pull down to retry.</Text>
          </View>
        ) : null}
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
