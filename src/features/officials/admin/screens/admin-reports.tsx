import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

import { useColors } from '@/features/officials/shared/constants/theme';
import { contentMaxWidthWide } from '@/features/officials/shared/constants/layout';
import { api } from '@/lib/api';
import type { AdminStatsRow, ApiResponse } from '@/lib/api-types';

type Report = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accent: string;
};

const REPORTS: Report[] = [
  { icon: 'people', title: 'Farmer Report', description: 'All registered farmers, profiles, and credit scores', accent: '#1A8F5C' },
  { icon: 'cash', title: 'Loan Report', description: 'Application stats, approvals, rejections, disbursements', accent: '#3A9BD5' },
  { icon: 'location', title: 'Regional Report', description: 'District-wise farmer and loan distribution', accent: '#8B5CF6' },
  { icon: 'analytics', title: 'Credit Score Report', description: 'Score distribution and risk assessment summary', accent: '#F59E0B' },
];

export default function AdminReportsScreen() {
  const colors = useColors();
  // Real platform statistics from /api/admin/dashboard/stats — the same
  // numbers the dashboard hero shows. The previous hardcoded values
  // (510/234/72%/89) were mock data.
  const [stats, setStats] = useState<AdminStatsRow | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<AdminStatsRow>>('/api/admin/dashboard/stats');
      setStats(res?.data ?? null);
    } catch {
      // Stat tiles fall back to 0 rather than fake numbers.
      setStats(null);
    }
  }, []);

  useEffect(() => {
    // Kickoff deferred out of the effect body (repo lint rule); state
    // updates happen only after the fetch resolves.
    const timer = setTimeout(() => void loadStats(), 0);
    return () => clearTimeout(timer);
  }, [loadStats]);

  const totalLoans = Number(stats?.totalLoans ?? 0);
  const approvedLoans = Number(stats?.approvedLoans ?? 0);
  const approvalRate = totalLoans > 0 ? Math.round((approvedLoans / totalLoans) * 100) : 0;
  const activeUsers = Number(stats?.activeFieldOfficers ?? 0) + Number(stats?.activeBankOfficers ?? 0);

  const STATS = [
    { icon: 'leaf' as const, value: String(stats?.totalFarmers ?? 0), label: 'Total Farmers', color: '#22C55E' },
    { icon: 'wallet' as const, value: String(totalLoans), label: 'Total Loans', color: '#3B82F6' },
    { icon: 'checkmark-circle' as const, value: `${approvalRate}%`, label: 'Approval Rate', color: '#A78BFA' },
    { icon: 'people' as const, value: String(activeUsers), label: 'Active Users', color: '#F472B6' },
  ];

  const handleExportPdf = (title: string) => {
    Alert.alert('Export PDF', `${title} exported as PDF`);
  };

  const handleExportExcel = (title: string) => {
    Alert.alert('Export Excel', `${title} exported as Excel`);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.dashboard.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.brand, { color: colors.greenLight }]}>SOFOL</Text>

      <View style={styles.statsRow}>
        {STATS.map((stat, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: colors.dashboard.cardBg }]}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
              <Ionicons name={stat.icon} size={20} color={stat.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.dashboard.textPrimary }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.dashboard.textSecondary }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {REPORTS.map((report, i) => (
        <View key={i} style={[styles.card, { backgroundColor: colors.dashboard.cardBg }]}>
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
            <View style={styles.exportRow}>
              <Pressable
                style={({ pressed }) => [styles.exportBtn, styles.exportBtnPdf, pressed && styles.exportBtnPressed]}
                onPress={() => handleExportPdf(report.title)}>
                <Ionicons name="document" size={15} color="#DC2626" />
                <Text style={styles.exportBtnPdfText}>Export PDF</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.exportBtn, styles.exportBtnExcel, pressed && styles.exportBtnPressed]}
                onPress={() => handleExportExcel(report.title)}>
                <Ionicons name="grid" size={15} color="#16A34A" />
                <Text style={styles.exportBtnExcelText}>Export Excel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ))}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    maxWidth: contentMaxWidthWide,
    alignSelf: 'center',
    width: '100%',
  },
  brand: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  card: {
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  cardBody: {
    flex: 1,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  exportRow: {
    flexDirection: 'row',
    gap: 10,
    marginLeft: 56,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  exportBtnPressed: {
    opacity: 0.7,
  },
  exportBtnPdf: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  exportBtnPdfText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  exportBtnExcel: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  exportBtnExcelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
  },
});
