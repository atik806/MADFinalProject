import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BarChart } from '@/features/officials/shared/components/charts/bar-chart';
import { LineChart } from '@/features/officials/shared/components/charts/line-chart';
import { StatCard } from '@/features/officials/shared/components/stat-card';
import { ChartLegend } from '@/features/officials/shared/components/chart-legend';
import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { useColors } from '@/features/officials/shared/constants/theme';
import { borderRadius, contentMaxWidthWide, shadows } from '@/features/officials/shared/constants/layout';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAdminOverview, type AdminOverview } from '@/features/officials/admin/services/admin-api';

const ADMIN_ACTIONS = [
  { icon: 'people' as const, title: 'User Management', route: '/officials/(admin)/users' },
  { icon: 'document-text' as const, title: 'Reports', route: '/officials/(admin)/reports' },
  { icon: 'settings' as const, title: 'System Config', route: '/officials/(admin)/settings' },
  { icon: 'document-lock' as const, title: 'Audit Logs', route: '/officials/(admin)/audit-logs' },
];

const STATUS_COLOR: Record<string, string> = {
  success: '#22C55E',
  pending: '#F59E0B',
  failed: '#EF4444',
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetchAdminOverview();
      setOverview(res.data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load('initial'), 0);
    return () => clearTimeout(t);
  }, [load]);

  const actions = ADMIN_ACTIONS.map((a, i) => ({
    ...a,
    iconBg: [colors.blueLight, colors.greenLight, '#8B5CF6', '#F59E0B'][i] ?? colors.greenLight,
  }));

  const stats = overview?.stats;
  const decidedLoans = (stats?.approvedLoans ?? 0) + (stats?.rejectedLoans ?? 0);
  const approvalRate = decidedLoans > 0 ? Math.round(((stats?.approvedLoans ?? 0) / decidedLoans) * 100) : 0;

  const heroStats = [
    { icon: 'leaf' as const, iconBg: '#A78BFA', value: String(stats?.totalFarmers ?? 0), label: 'Total Farmers', sub: `${stats?.verifiedFarmers ?? 0} verified` },
    { icon: 'wallet' as const, iconBg: '#60A5FA', value: String(stats?.totalLoans ?? 0), label: 'Total Loans', sub: `${stats?.pendingLoans ?? 0} pending` },
    { icon: 'checkmark-circle' as const, iconBg: '#34D399', value: `${approvalRate}%`, label: 'Approval Rate', sub: `${stats?.approvedLoans ?? 0} approved` },
    { icon: 'people' as const, iconBg: '#F472B6', value: String(stats?.activeFieldOfficers ?? 0), label: 'Active Field Officers', sub: `${stats?.totalFieldOfficers ?? 0} total` },
  ];

  const registrationData = (overview?.registrationTrend ?? []).map((d) => ({ label: d.label, value: d.value }));
  const loanData = (overview?.loanAnalytics ?? []).map((d) => ({
    label: d.label,
    values: [
      { key: 'approved' as const, value: d.approved, color: colors.greenLight },
      { key: 'pending' as const, value: d.pending, color: '#F59E0B' },
    ],
  }));

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
      <ScreenHeader title="Admin Dashboard" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={colors.greenLight} />}>
        {error ? (
          <View style={[styles.errorCard, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
            <Ionicons name="cloud-offline-outline" size={28} color={colors.dashboard.textSecondary} />
            <Text style={[styles.errorText, { color: colors.dashboard.textPrimary }]}>{error}</Text>
            <Pressable onPress={() => load('initial')} style={[styles.retryBtn, { backgroundColor: colors.greenLight }]}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
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
          {registrationData.some((d) => d.value > 0) ? (
            <LineChart data={registrationData} />
          ) : (
            <Text style={[styles.emptyChart, { color: colors.dashboard.textSecondary }]}>No registrations in this period</Text>
          )}
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.dashboard.cardBg }]}>
          <Text style={[styles.chartTitle, { color: colors.dashboard.textPrimary }]}>Loan Analytics</Text>
          <ChartLegend items={[{ label: 'Approved', color: colors.greenLight }, { label: 'Pending', color: '#F59E0B' }]} />
          {loanData.some((d) => d.values.some((v) => v.value > 0)) ? (
            <BarChart data={loanData} />
          ) : (
            <Text style={[styles.emptyChart, { color: colors.dashboard.textSecondary }]}>No loan activity in this period</Text>
          )}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.dashboard.textSecondary }]}>System Actions</Text>
        <View style={[styles.card, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <View style={styles.overviewRow}>
            {actions.slice(0, 2).map((action, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [styles.overviewItem, pressed && styles.pressed]}
                onPress={() => router.push(action.route as unknown as any)}
              >
                <View style={[styles.overviewIcon, { backgroundColor: action.iconBg + '20' }]}>
                  <Ionicons name={action.icon} size={22} color={action.iconBg} />
                </View>
                <Text style={[styles.overviewLabel, { color: colors.dashboard.textPrimary }]}>{action.title}</Text>
              </Pressable>
            ))}
          </View>
          <View style={[styles.overviewDivider, { backgroundColor: colors.dashboard.border }]} />
          <View style={styles.overviewRow}>
            {actions.slice(2, 4).map((action, i) => (
              <Pressable
                key={i + 2}
                style={({ pressed }) => [styles.overviewItem, pressed && styles.pressed]}
                onPress={() => router.push(action.route as unknown as any)}
              >
                <View style={[styles.overviewIcon, { backgroundColor: action.iconBg + '20' }]}>
                  <Ionicons name={action.icon} size={22} color={action.iconBg} />
                </View>
                <Text style={[styles.overviewLabel, { color: colors.dashboard.textPrimary }]}>{action.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.dashboard.textSecondary }]}>Recent Activity</Text>
        <View style={[styles.card, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border, padding: 4 }]}>
          {(overview?.recentActivity ?? []).length === 0 ? (
            <Text style={[styles.emptyActivity, { color: colors.dashboard.textSecondary }]}>No recent activity</Text>
          ) : (
            (overview?.recentActivity ?? []).map((item, i, arr) => (
              <View key={item.id}>
                <View style={styles.activityRow}>
                  <View style={[styles.activityDot, { backgroundColor: STATUS_COLOR[item.status] ?? colors.dashboard.textSecondary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.activityAction, { color: colors.dashboard.textPrimary }]} numberOfLines={2}>{item.action}</Text>
                    <Text style={[styles.activityMeta, { color: colors.dashboard.textSecondary }]}>
                      {item.actorName} · {item.module} · {timeAgo(item.createdAt)}
                    </Text>
                  </View>
                </View>
                {i < arr.length - 1 && <View style={[styles.overviewDivider, { backgroundColor: colors.dashboard.border }]} />}
              </View>
            ))
          )}
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
  errorCard: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: 'center', gap: 10, marginBottom: 16 },
  errorText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 10 },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
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
  emptyChart: { fontSize: 13, paddingVertical: 24, textAlign: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 8 },
  card: { borderRadius: borderRadius.md, borderWidth: 1, ...shadows.cardSubtle, marginBottom: 4 },
  overviewRow: { flexDirection: 'row' },
  overviewItem: { flex: 1, alignItems: 'center', padding: 16 },
  overviewIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  overviewLabel: { fontSize: 12, fontWeight: '500', textAlign: 'center', lineHeight: 16 },
  overviewDivider: { height: 1, marginHorizontal: 14 },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  activityAction: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  activityMeta: { fontSize: 11 },
  emptyActivity: { fontSize: 13, padding: 20, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
