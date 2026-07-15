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
import { heroStats, registrationData, adminActions } from '@/data';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const isTablet = width >= 768;

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const loanData = [
    { label: 'Apr', values: [{ key: 'approved' as const, value: 45, color: colors.greenLight }, { key: 'pending' as const, value: 20, color: '#F59E0B' }] },
    { label: 'May', values: [{ key: 'approved' as const, value: 62, color: colors.greenLight }, { key: 'pending' as const, value: 15, color: '#F59E0B' }] },
    { label: 'Jun', values: [{ key: 'approved' as const, value: 78, color: colors.greenLight }, { key: 'pending' as const, value: 12, color: '#F59E0B' }] },
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
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 8 },
  card: { borderRadius: borderRadius.md, borderWidth: 1, ...shadows.cardSubtle, marginBottom: 4 },
  overviewRow: { flexDirection: 'row' },
  overviewItem: { flex: 1, alignItems: 'center', padding: 16 },
  overviewIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  overviewLabel: { fontSize: 12, fontWeight: '500', textAlign: 'center', lineHeight: 16 },
  overviewDivider: { height: 1, marginHorizontal: 14 },
  pressed: { opacity: 0.7 },
});
