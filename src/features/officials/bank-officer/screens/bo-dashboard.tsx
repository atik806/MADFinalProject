import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionCard } from '@/features/officials/shared/components/action-card';
import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { StatCard } from '@/features/officials/shared/components/stat-card';
import { StatusBadge } from '@/features/officials/shared/components/status-badge';
import { borderRadius, contentMaxWidthWide, shadows } from '@/features/officials/shared/constants/layout';
import { useColors } from '@/features/officials/shared/constants/theme';
import { farmerName, num, useBankReview } from '@/features/officials/bank-officer/hooks/useBankReview';

export default function BankOfficerDashboardScreen() {
  const router = useRouter();
  const colors = useColors();
  const { rows, loading, refreshing, error, refresh } = useBankReview();

  const pending = rows.filter(r => r.status === 'pending');
  const underReview = rows.filter(r => r.status === 'under_review');
  const approved = rows.filter(r => r.status === 'approved');
  const totalDisbursed = approved.reduce((s, r) => s + num(r.approved_amount ?? r.amount), 0);

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.greenLight} />}
      >
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.dashboard.redDown + '18', borderColor: colors.dashboard.redDown }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.dashboard.redDown} />
            <Text style={[styles.errorText, { color: colors.dashboard.redDown }]}>{error}</Text>
          </View>
        )}

        <LinearGradient
          colors={['#1E40AF', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroAvatar}>
              <Ionicons name="business" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroGreeting}>Loan review queue</Text>
              <Text style={styles.heroName}>{rows.length} forwarded {rows.length === 1 ? 'application' : 'applications'}</Text>
              <Text style={styles.heroRole}>{pending.length} awaiting first review</Text>
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            <StatCard hero icon="document-text" iconBg="#FFFFFF" value={String(pending.length)} label="Pending" />
            <StatCard hero icon="hourglass" iconBg="#FFFFFF" value={String(underReview.length)} label="Under Review" />
          </View>
        </LinearGradient>

        <Text style={[styles.sectionLabel, { color: colors.dashboard.textSecondary }]}>Overview</Text>
        <View style={[styles.card, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <View style={[styles.overviewIcon, { backgroundColor: '#3A9BD520' }]}>
                <Ionicons name="document-text-outline" size={22} color="#3A9BD5" />
              </View>
              <Text style={[styles.overviewValue, { color: colors.dashboard.textPrimary }]}>{rows.length}</Text>
              <Text style={[styles.overviewLabel, { color: colors.dashboard.textSecondary }]}>In Queue</Text>
            </View>
            <View style={styles.overviewItem}>
              <View style={[styles.overviewIcon, { backgroundColor: '#22C55E20' }]}>
                <Ionicons name="checkmark-circle-outline" size={22} color="#22C55E" />
              </View>
              <Text style={[styles.overviewValue, { color: colors.dashboard.textPrimary }]}>{approved.length}</Text>
              <Text style={[styles.overviewLabel, { color: colors.dashboard.textSecondary }]}>Approved</Text>
            </View>
          </View>
          <View style={[styles.overviewDivider, { backgroundColor: colors.dashboard.border }]} />
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <View style={[styles.overviewIcon, { backgroundColor: '#EF444420' }]}>
                <Ionicons name="close-circle-outline" size={22} color="#EF4444" />
              </View>
              <Text style={[styles.overviewValue, { color: colors.dashboard.textPrimary }]}>
                {rows.filter(r => r.status === 'rejected').length}
              </Text>
              <Text style={[styles.overviewLabel, { color: colors.dashboard.textSecondary }]}>Rejected</Text>
            </View>
            <View style={styles.overviewItem}>
              <View style={[styles.overviewIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="wallet-outline" size={22} color="#F59E0B" />
              </View>
              <Text style={[styles.overviewValue, { color: colors.dashboard.textPrimary }]}>
                {`৳${(totalDisbursed / 100000).toFixed(1)}L`}
              </Text>
              <Text style={[styles.overviewLabel, { color: colors.dashboard.textSecondary }]}>Sanctioned</Text>
            </View>
          </View>
        </View>

        {rows.length === 0 && !error && (
          <View style={[styles.emptyCard, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
            <Ionicons name="checkmark-done-outline" size={44} color={colors.dashboard.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.dashboard.textPrimary }]}>Queue is empty</Text>
            <Text style={[styles.emptySubtitle, { color: colors.dashboard.textSecondary }]}>
              Applications appear here once a field officer forwards them.
            </Text>
          </View>
        )}

        {pending.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.dashboard.textSecondary }]}>Awaiting Review</Text>
            <View style={[styles.card, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
              {pending.slice(0, 4).map((row, i) => (
                <Pressable key={row.id} onPress={() => router.push('/officials/approvals')} style={({ pressed }) => pressed && styles.pressed}>
                  <View style={styles.pendingRow}>
                    <View style={styles.pendingInfo}>
                      <Text style={[styles.pendingTitle, { color: colors.dashboard.textPrimary }]}>
                        {row.title ?? 'Loan application'}
                      </Text>
                      <Text style={[styles.pendingMeta, { color: colors.dashboard.textSecondary }]}>
                        {farmerName(row)} • ৳{num(row.amount).toLocaleString()}
                      </Text>
                    </View>
                    <StatusBadge status="pending" />
                  </View>
                  {i < Math.min(pending.length, 4) - 1 && <View style={[styles.divider, { backgroundColor: colors.dashboard.border }]} />}
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={[styles.sectionLabel, { color: colors.dashboard.textSecondary }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <ActionCard icon="checkmark-circle-outline" iconBg="#22C55E" title="Review Applications" onPress={() => router.push('/officials/approvals')} />
          <ActionCard icon="cash-outline" iconBg="#3B82F6" title="Manage Loans" onPress={() => router.push('/officials/loans')} />
          <ActionCard icon="settings-outline" iconBg="#F59E0B" title="Settings" onPress={() => router.push('/officials/settings')} />
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
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: borderRadius.sm, borderWidth: 1, marginBottom: 12 },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },
  heroCard: { borderRadius: borderRadius.xl, padding: 16, marginBottom: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  heroAvatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTextCol: { flex: 1 },
  heroGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  heroName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  heroRole: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  heroStatsRow: { flexDirection: 'row', gap: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 8 },
  card: { borderRadius: borderRadius.md, borderWidth: 1, ...shadows.cardSubtle, marginBottom: 4 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  pendingInfo: { flex: 1 },
  pendingTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  pendingMeta: { fontSize: 12 },
  divider: { height: 1, marginHorizontal: 14 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pressed: { opacity: 0.7 },
  overviewRow: { flexDirection: 'row' },
  overviewItem: { flex: 1, alignItems: 'center', padding: 16 },
  overviewIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  overviewValue: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  overviewLabel: { fontSize: 12, fontWeight: '500', textAlign: 'center', lineHeight: 16 },
  overviewDivider: { height: 1, marginHorizontal: 14 },
  emptyCard: { borderRadius: borderRadius.md, borderWidth: 1, alignItems: 'center', padding: 40, gap: 8, marginTop: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },
});
