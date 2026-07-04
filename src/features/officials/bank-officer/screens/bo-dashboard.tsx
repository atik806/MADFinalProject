import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionCard } from '@/features/officials/shared/components/action-card';
import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { StatCard } from '@/features/officials/shared/components/stat-card';
import { StatusBadge } from '@/features/officials/shared/components/status-badge';
import { borderRadius, contentMaxWidthWide, shadows } from '@/features/officials/shared/constants/layout';
import { useColors } from '@/features/officials/shared/constants/theme';
import { useLoans } from '@/contexts/LoanContext';

export default function BankOfficerDashboardScreen() {
  const colors = useColors();
  const { applications, activeLoans } = useLoans();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const pendingApps = applications.filter(a => a.status === 'pending');
  const approvedApps = applications.filter(a => a.status === 'approved');
  const totalDisbursed = applications.reduce((s, a) => s + (a.status === 'approved' ? a.amount : 0), 0);

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.dashboard.bg }]}>
        <ScreenHeader title="Bank Officer Dashboard" />
        <View style={styles.loadingContainer}>
          {[...Array(4)].map((_, i) => (
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
      <ScreenHeader title="Bank Officer Dashboard" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.greenLight} />}
      >
        <LinearGradient
          colors={['#1E40AF', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroAvatar}>
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroGreeting}>Good morning,</Text>
              <Text style={styles.heroName}>Ayesha Khatun</Text>
              <Text style={styles.heroRole}>Bank Officer • Sonali Bank</Text>
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            <StatCard hero icon="document-text" iconBg="#FFFFFF" value={String(pendingApps.length)} label="Pending Applications" />
            <StatCard hero icon="checkmark-circle" iconBg="#FFFFFF" value={String(activeLoans.length)} label="Active Loans" />
          </View>
        </LinearGradient>

        <Text style={[styles.sectionLabel, { color: colors.dashboard.textSecondary }]}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="document-text-outline" iconBg="#3A9BD5" value={String(applications.length)} label="Total Applications" sub="All time" />
          <StatCard icon="checkmark-circle-outline" iconBg="#22C55E" value={String(approvedApps.length)} label="Approved This Month" />
          <StatCard icon="cash-outline" iconBg="#8B5CF6" value={String(activeLoans.length)} label="Active Loans" />
          <StatCard icon="wallet-outline" iconBg="#F59E0B" value={`৳${(totalDisbursed / 100000).toFixed(1)}L`} label="Disbursed Amount" />
        </View>

        {pendingApps.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.dashboard.textSecondary }]}>Pending Applications</Text>
            <View style={[styles.card, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
              {pendingApps.slice(0, 3).map((app, i) => (
                <Pressable key={app.id} onPress={() => {}} style={({ pressed }) => pressed && styles.pressed}>
                  <View style={styles.pendingRow}>
                    <View style={styles.pendingInfo}>
                      <Text style={[styles.pendingTitle, { color: colors.dashboard.textPrimary }]}>{app.title}</Text>
                      <Text style={[styles.pendingMeta, { color: colors.dashboard.textSecondary }]}>
                        ৳{app.amount.toLocaleString()} • {app.date}
                      </Text>
                    </View>
                    <StatusBadge status={app.status === 'under_review' ? 'pending' : app.status} />
                  </View>
                  {i < pendingApps.length - 1 && <View style={[styles.divider, { backgroundColor: colors.dashboard.border }]} />}
                </Pressable>
              ))}
            </View>
          </>
        )}

        {activeLoans.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.dashboard.textSecondary }]}>Active Loans</Text>
            <View style={[styles.card, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
              {activeLoans.map((loan, i) => (
                <View key={loan.id}>
                  <View style={styles.activeLoanRow}>
                    <View style={styles.activeLoanInfo}>
                      <Text style={[styles.activeLoanTitle, { color: colors.dashboard.textPrimary }]}>{loan.title}</Text>
                      <Text style={[styles.activeLoanMeta, { color: colors.dashboard.textSecondary }]}>
                        ৳{loan.amount.toLocaleString()} • {loan.duration} • {loan.interest}
                      </Text>
                    </View>
                    <View style={styles.activeLoanRight}>
                      <Text style={[styles.activeLoanProgress, { color: colors.greenLight }]}>{loan.progress}%</Text>
                      <View style={[styles.progressBarSmall, { backgroundColor: colors.dashboard.border }]}>
                        <View style={[styles.progressFillSmall, { backgroundColor: colors.greenLight, width: `${loan.progress}%` }]} />
                      </View>
                    </View>
                  </View>
                  {i < activeLoans.length - 1 && <View style={[styles.divider, { backgroundColor: colors.dashboard.border }]} />}
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={[styles.sectionLabel, { color: colors.dashboard.textSecondary }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <ActionCard icon="checkmark-circle-outline" iconBg="#22C55E" title="Review Applications" onPress={() => {}} />
          <ActionCard icon="cash-outline" iconBg="#3B82F6" title="Manage Loans" onPress={() => {}} />
          <ActionCard icon="bar-chart-outline" iconBg="#8B5CF6" title="View Reports" onPress={() => {}} />
          <ActionCard icon="settings-outline" iconBg="#F59E0B" title="Settings" onPress={() => {}} />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, maxWidth: contentMaxWidthWide, alignSelf: 'center', width: '100%' },
  loadingContainer: { flex: 1, padding: 16, gap: 12 },
  skeletonCard: { height: 80, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  heroCard: { borderRadius: borderRadius.xl, padding: 16, marginBottom: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  heroAvatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTextCol: { flex: 1 },
  heroGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  heroName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  heroRole: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  heroStatsRow: { flexDirection: 'row', gap: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  card: { borderRadius: borderRadius.md, borderWidth: 1, ...shadows.cardSubtle, marginBottom: 4 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  pendingInfo: { flex: 1 },
  pendingTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  pendingMeta: { fontSize: 12 },
  divider: { height: 1, marginHorizontal: 14 },
  activeLoanRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  activeLoanInfo: { flex: 1 },
  activeLoanTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  activeLoanMeta: { fontSize: 12 },
  activeLoanRight: { alignItems: 'flex-end', gap: 4 },
  activeLoanProgress: { fontSize: 16, fontWeight: '800' },
  progressBarSmall: { height: 4, width: 60, borderRadius: 2, overflow: 'hidden' },
  progressFillSmall: { height: 4, borderRadius: 2 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pressed: { opacity: 0.7 },
});
