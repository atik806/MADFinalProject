import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionCard } from '@/features/officials/shared/components/action-card';
import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { StatCard } from '@/features/officials/shared/components/stat-card';
import { StatusBadge, type StatusType } from '@/features/officials/shared/components/status-badge';
import { borderRadius, contentMaxWidth, shadows } from '@/features/officials/shared/constants/layout';
import { useColors } from '@/features/officials/shared/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { ApiResponse, BankOfficerProfileRow, BankOfficerQueueRow, ListResult } from '@/lib/api-types';

const BANK_STATUSES = new Set(['pending', 'under_review', 'approved', 'rejected', 'active']);

const STATUS_AS_BADGE = (status?: string): StatusType =>
  BANK_STATUSES.has(status ?? '') ? (status as StatusType) : 'pending';

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const d = new Date(String(value));
  if (!Number.isFinite(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function BankOfficerDashboardScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [officer, setOfficer] = useState<BankOfficerProfileRow | null>(null);
  const [items, setItems] = useState<BankOfficerQueueRow[]>([]);

  const loadDashboard = useCallback(async () => {
    try {
      // The officer's own profile (shared { success, message, data } shape)
      // plus the shared bank queue — server-scoped by the bearer token.
      const [profileRes, queueRes] = await Promise.all([
        api.get<ApiResponse<BankOfficerProfileRow>>('/api/bank-officer/profile/me'),
        api.get<ApiResponse<ListResult<BankOfficerQueueRow>>>('/api/bank-officer/loans?pageSize=100'),
      ]);
      setOfficer(profileRes?.data ?? null);
      setItems(queueRes?.data?.items ?? []);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message ?? 'Could not load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadDashboard(), 0);
    return () => clearTimeout(timer);
  }, [loadDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard().finally(() => setRefreshing(false));
  }, [loadDashboard]);

  const pendingApps = items.filter((a) => a.status === 'pending');
  const underReviewApps = items.filter((a) => a.status === 'under_review');
  const approvedApps = items.filter((a) => a.status === 'approved');
  const rejectedApps = items.filter((a) => a.status === 'rejected');
  const totalDisbursed = approvedApps.reduce((s, a) => s + Number(a.approved_amount ?? a.amount ?? 0), 0);
  const recent = items.slice(0, 5);

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.dashboard.bg }]}>
        <ScreenHeader title="Bank Officer Dashboard" />
        <View style={styles.loadingContainer}>
          {[...Array(4)].map((_, i) => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
              <ActivityIndicator color={colors.greenLight} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  const bg = colors.dashboard.bg;
  const cardBg = colors.dashboard.cardBg;
  const textPrimary = colors.dashboard.textPrimary;
  const textSecondary = colors.dashboard.textSecondary;
  const border = colors.dashboard.border;

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <ScreenHeader title="Bank Officer Dashboard" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.greenLight} />}
      >
        {loadError ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.dashboard.redDown }]}>
            <View style={styles.emptyInner}>
              <Ionicons name="cloud-offline-outline" size={36} color={colors.dashboard.redDown} />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>Could not load your data</Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>{loadError}</Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>Pull down to retry.</Text>
            </View>
          </View>
        ) : null}

        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.deepGreen }]}>
          <View style={styles.heroRow}>
            <View style={styles.heroAvatar}>
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroGreeting}>Good morning,</Text>
              <Text style={styles.heroName}>{officer?.name_en ?? officer?.name_bn ?? user?.name ?? 'Bank Officer'}</Text>
              <Text style={styles.heroRole}>
                {[officer?.designation, officer?.bank_name ?? officer?.branch_name].filter(Boolean).join(' • ') || 'Bank Officer • SOFOL'}
              </Text>
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            <StatCard hero icon="document-text" iconBg="#FFFFFF" value={String(pendingApps.length)} label="Pending Applications" />
            <StatCard hero icon="eye" iconBg="#FFFFFF" value={String(underReviewApps.length)} label="Under Review" />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: textSecondary }]}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="documents-outline" iconBg="#3A9BD5" value={String(items.length)} label="Forwarded Applications" sub="All time" />
          <StatCard icon="checkmark-circle-outline" iconBg="#22C55E" value={String(approvedApps.length)} label="Approved" />
          <StatCard icon="close-circle-outline" iconBg="#EF4444" value={String(rejectedApps.length)} label="Rejected" />
          <StatCard icon="wallet-outline" iconBg="#F59E0B" value={`৳${totalDisbursed.toLocaleString()}`} label="Sanctioned Amount" />
        </View>

        {recent.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: textSecondary }]}>Recent Applications</Text>
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              {recent.map((app, i) => (
                <Pressable key={app.id} onPress={() => router.push('/officials/(bank-officer)/approvals')} style={({ pressed }) => pressed && styles.pressed}>
                  <View style={styles.pendingRow}>
                    <View style={styles.pendingInfo}>
                      <Text style={[styles.pendingTitle, { color: textPrimary }]}>
                        {app.farmer?.name_en ?? app.farmer?.name_bn ?? 'Farmer'}
                      </Text>
                      <Text style={[styles.pendingMeta, { color: textSecondary }]}>
                        ৳{(app.amount ?? 0).toLocaleString()} • Forwarded {formatDate(app.forwarded_at)}
                      </Text>
                    </View>
                    <StatusBadge status={STATUS_AS_BADGE(app.status)} />
                  </View>
                  {i < recent.length - 1 && <View style={[styles.divider, { backgroundColor: border }]} />}
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={[styles.sectionLabel, { color: textSecondary }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <ActionCard icon="checkmark-circle-outline" iconBg="#22C55E" title="Review Applications" onPress={() => router.push('/officials/(bank-officer)/approvals')} />
          <ActionCard icon="cash-outline" iconBg="#3B82F6" title="Loan Management" onPress={() => router.push('/officials/(bank-officer)/loans')} />
          <ActionCard icon="settings-outline" iconBg="#F59E0B" title="Settings" onPress={() => router.push('/officials/(bank-officer)/settings')} />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
  loadingContainer: { flex: 1, padding: 16, gap: 12 },
  skeletonCard: { height: 80, borderRadius: borderRadius.md, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
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
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emptyInner: { alignItems: 'center', padding: 24, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});