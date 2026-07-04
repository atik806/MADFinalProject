import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/features/officials/shared/constants/theme';
import { contentMaxWidthWide } from '@/features/officials/shared/constants/layout';

type Report = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accent: string;
};

const REPORTS: Report[] = [
  { icon: 'people', title: 'Farmer Report', description: 'All registered farmers, profiles, and credit scores', accent: BrandColors.greenLight },
  { icon: 'cash', title: 'Loan Report', description: 'Application stats, approvals, rejections, disbursements', accent: BrandColors.blueLight },
  { icon: 'location', title: 'Regional Report', description: 'District-wise farmer and loan distribution', accent: '#8B5CF6' },
  { icon: 'analytics', title: 'Credit Score Report', description: 'Score distribution and risk assessment summary', accent: '#F59E0B' },
];

export default function AdminReportsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>SOFOL</Text>

      {REPORTS.map((report, i) => (
        <View key={i} style={styles.card}>
          <View style={[styles.accentBar, { backgroundColor: report.accent }]} />
          <View style={styles.cardBody}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: report.accent + '15' }]}>
                <Ionicons name={report.icon} size={20} color={report.accent} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>{report.title}</Text>
                <Text style={styles.cardDesc}>{report.description}</Text>
              </View>
            </View>
            <View style={styles.exportRow}>
              <Pressable style={({ pressed }) => [styles.exportBtn, styles.exportBtnPdf, pressed && styles.exportBtnPressed]}>
                <Ionicons name="document" size={15} color="#DC2626" />
                <Text style={styles.exportBtnPdfText}>Export PDF</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.exportBtn, styles.exportBtnExcel, pressed && styles.exportBtnPressed]}>
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
    backgroundColor: BrandColors.dashboard.bg,
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
    color: BrandColors.greenLight,
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 16,
  },
  card: {
    backgroundColor: BrandColors.dashboard.cardBg,
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
    color: BrandColors.dashboard.textPrimary,
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 13,
    color: BrandColors.dashboard.textSecondary,
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
