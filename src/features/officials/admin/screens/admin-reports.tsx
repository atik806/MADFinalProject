import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { useColors } from '@/features/officials/shared/constants/theme';
import { contentMaxWidthWide } from '@/features/officials/shared/constants/layout';
import {
  fetchDashboardStats,
  fetchLoans,
  fetchUsers,
  type AdminLoanItem,
  type AdminUserItem,
  type DashboardStats,
} from '@/features/officials/admin/services/admin-api';

type ReportKey = 'farmers' | 'loans' | 'regional' | 'credit';
type ReportDef = {
  key: ReportKey;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accent: string;
};

const REPORTS: ReportDef[] = [
  { key: 'farmers', icon: 'people', title: 'Farmer Report', description: 'All registered farmers, contacts, and credit scores', accent: '#1A8F5C' },
  { key: 'loans', icon: 'cash', title: 'Loan Report', description: 'Applications, approvals, rejections, and verification status', accent: '#3A9BD5' },
  { key: 'regional', icon: 'location', title: 'Regional Report', description: 'District-wise farmer distribution', accent: '#8B5CF6' },
  { key: 'credit', icon: 'analytics', title: 'Credit Score Report', description: 'Score distribution across the farmer base', accent: '#F59E0B' },
];

const FETCH_PAGE = 100;
const MAX_PAGES = 20; // hard cap: 2000 rows per export

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n');
}

async function exportCsv(filename: string, csv: string) {
  if (Platform.OS === 'web') {
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    } catch {
      Alert.alert('Export failed', 'Could not generate the file in this browser.');
      return;
    }
  }
  await Share.share({ title: filename, message: csv });
}

async function fetchAllFarmers(): Promise<AdminUserItem[]> {
  const out: AdminUserItem[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetchUsers({ role: 'farmer', page, pageSize: FETCH_PAGE });
    out.push(...res.data.items);
    if (page >= res.data.pagination.totalPages) break;
  }
  return out;
}
async function fetchAllLoans(): Promise<AdminLoanItem[]> {
  const out: AdminLoanItem[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetchLoans({ page, pageSize: FETCH_PAGE });
    out.push(...res.data.items);
    if (page >= res.data.pagination.totalPages) break;
  }
  return out;
}

export default function AdminReportsScreen() {
  const colors = useColors();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<ReportKey | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetchDashboardStats();
      setStats(res.data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load report data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load('initial'), 0);
    return () => clearTimeout(t);
  }, [load]);

  const runExport = useCallback(async (key: ReportKey) => {
    setBusy(key);
    try {
      if (key === 'farmers') {
        const farmers = await fetchAllFarmers();
        const csv = toCsv(
          ['Name', 'Phone', 'Email', 'Location', 'Primary Crop', 'Credit Score', 'Verified', 'Member Since'],
          farmers.map((f) => [
            f.name, f.phone, f.email, f.location, f.primary_crop, f.credit_score ?? 0,
            f.is_verified ? 'Yes' : 'No',
            f.member_since ? new Date(f.member_since).toISOString().slice(0, 10) : '',
          ]),
        );
        await exportCsv(`farmer-report-${Date.now()}.csv`, csv);
      } else if (key === 'loans') {
        const loans = await fetchAllLoans();
        const csv = toCsv(
          ['Farmer', 'Phone', 'Amount', 'Purpose', 'Status', 'Verification', 'Field Officer', 'Created'],
          loans.map((l) => [
            l.farmer_name, l.farmer_phone, l.amount, l.purpose, l.status, l.verification_status,
            l.field_officer_name, l.created_at ? new Date(l.created_at).toISOString().slice(0, 10) : '',
          ]),
        );
        await exportCsv(`loan-report-${Date.now()}.csv`, csv);
      } else if (key === 'regional') {
        const farmers = await fetchAllFarmers();
        const byRegion = new Map<string, { total: number; verified: number }>();
        farmers.forEach((f) => {
          const k = (f.location || 'Unspecified').trim();
          const cur = byRegion.get(k) ?? { total: 0, verified: 0 };
          cur.total += 1;
          if (f.is_verified) cur.verified += 1;
          byRegion.set(k, cur);
        });
        const csv = toCsv(
          ['Region', 'Farmers', 'Verified'],
          [...byRegion.entries()].sort((a, b) => b[1].total - a[1].total).map(([k, v]) => [k, v.total, v.verified]),
        );
        await exportCsv(`regional-report-${Date.now()}.csv`, csv);
      } else {
        const farmers = await fetchAllFarmers();
        const buckets = [
          { label: '0 (unscored)', min: 0, max: 0 },
          { label: '1–299', min: 1, max: 299 },
          { label: '300–499', min: 300, max: 499 },
          { label: '500–649', min: 500, max: 649 },
          { label: '650–749', min: 650, max: 749 },
          { label: '750+', min: 750, max: Infinity },
        ];
        const counts = buckets.map((b) => farmers.filter((f) => {
          const s = f.credit_score ?? 0;
          return s >= b.min && s <= b.max;
        }).length);
        const csv = toCsv(['Score Range', 'Farmers'], buckets.map((b, i) => [b.label, counts[i]]));
        await exportCsv(`credit-score-report-${Date.now()}.csv`, csv);
      }
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Could not build the report');
    } finally {
      setBusy(null);
    }
  }, []);

  const decided = (stats?.approvedLoans ?? 0) + (stats?.rejectedLoans ?? 0);
  const approvalRate = decided > 0 ? Math.round(((stats?.approvedLoans ?? 0) / decided) * 100) : 0;
  const statCards = [
    { icon: 'leaf' as const, value: String(stats?.totalFarmers ?? 0), label: 'Total Farmers', color: '#22C55E' },
    { icon: 'wallet' as const, value: String(stats?.totalLoans ?? 0), label: 'Total Loans', color: '#3B82F6' },
    { icon: 'checkmark-circle' as const, value: `${approvalRate}%`, label: 'Approval Rate', color: '#A78BFA' },
    { icon: 'people' as const, value: String(stats?.activeFieldOfficers ?? 0), label: 'Active Officers', color: '#F472B6' },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.dashboard.bg }]}>
      <ScreenHeader title="Reports" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={colors.greenLight} />}>
        <Text style={[styles.brand, { color: colors.greenLight }]}>SOFOL</Text>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.greenLight} />
          </View>
        ) : (
          <>
            {error ? (
              <Text style={[styles.errorLine, { color: colors.dashboard.redDown }]}>{error}</Text>
            ) : (
              <View style={styles.statsRow}>
                {statCards.map((stat, i) => (
                  <View key={i} style={[styles.statCard, { backgroundColor: colors.dashboard.cardBg }]}>
                    <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                      <Ionicons name={stat.icon} size={20} color={stat.color} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.dashboard.textPrimary }]}>{stat.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.dashboard.textSecondary }]}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {REPORTS.map((report) => (
              <View key={report.key} style={[styles.card, { backgroundColor: colors.dashboard.cardBg }]}>
                <View style={[styles.accentBar, { backgroundColor: report.accent }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconWrap, { backgroundColor: report.accent + '15' }]}>
                      <Ionicons name={report.icon} size={20} color={report.accent} />
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text style={[styles.cardTitle, { color: colors.dashboard.textPrimary }]}>{report.title}</Text>
                      <Text style={[styles.cardDesc, { color: colors.dashboard.textSecondary }]}>{report.description}</Text>
                    </View>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.exportBtn, { borderColor: report.accent }, pressed && { opacity: 0.7 }]}
                    disabled={busy !== null}
                    onPress={() => runExport(report.key)}>
                    {busy === report.key ? (
                      <ActivityIndicator size="small" color={report.accent} />
                    ) : (
                      <>
                        <Ionicons name={Platform.OS === 'web' ? 'download-outline' : 'share-outline'} size={15} color={report.accent} />
                        <Text style={[styles.exportBtnText, { color: report.accent }]}>
                          {Platform.OS === 'web' ? 'Download CSV' : 'Export CSV'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 16, maxWidth: contentMaxWidthWide, alignSelf: 'center', width: '100%' },
  brand: { fontSize: 13, fontWeight: '800', letterSpacing: 1.5, marginTop: 8, marginBottom: 16 },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  errorLine: { fontSize: 13, fontWeight: '600', marginBottom: 16 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '48%', flexGrow: 1, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 26, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 12, fontWeight: '500' },
  card: { borderRadius: 14, marginBottom: 12, flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2, overflow: 'hidden' },
  accentBar: { width: 4 },
  cardBody: { flex: 1, padding: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 3 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start', marginLeft: 56, minWidth: 140 },
  exportBtnText: { fontSize: 13, fontWeight: '600' },
});
