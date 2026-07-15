import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { StatusBadge } from '@/features/officials/shared/components/status-badge';
import { borderRadius, contentMaxWidth, shadows } from '@/features/officials/shared/constants/layout';
import { useColors } from '@/features/officials/shared/constants/theme';
import { useLoans, type LoanApplication } from '@/contexts/LoanContext';
import { LOAN_MANAGEMENT_FILTERS } from '@/data';

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected' | 'active';

type DisplayItem = Record<string, unknown> & {
  id: string;
  title: string;
  amount: number;
  status: string;
  purpose?: string;
  date?: string;
  interest?: string;
  duration?: string;
  progress?: number;
  nextPaymentAmount?: number;
  nextPaymentDate?: string;
  emi?: number;
  installmentsPaid?: number;
  installmentsTotal?: number;
};

export default function LoanManagementScreen() {
  const colors = useColors();
  const { applications, activeLoans } = useLoans();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredApps = applications.filter((app) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return false;
    return app.status === activeFilter;
  });

  const displayList = activeFilter === 'active' ? activeLoans : filteredApps;

  const searchedList: DisplayItem[] = displayList.filter((item) =>
    item.title?.toLowerCase().includes(search.toLowerCase()) ||
    item.id?.toLowerCase().includes(search.toLowerCase()),
  ) as DisplayItem[];

  return (
    <View style={[styles.screen, { backgroundColor: colors.dashboard.bg }]}>
      <ScreenHeader title="Loan Management" />
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.dashboard.textPrimary }]}
            placeholder="Search loans..."
            placeholderTextColor={colors.dashboard.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.dashboard.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={[styles.filterRow, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          {LOAN_MANAGEMENT_FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => { setActiveFilter(f.key); setExpandedId(null); }}
                style={[styles.filterBtn, active && { backgroundColor: colors.greenLight + '15' }]}>
                <Text style={[styles.filterLabel, { color: active ? colors.greenLight : colors.dashboard.textSecondary }, active && { fontWeight: '700' }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {searchedList.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
            <Ionicons name="cash-outline" size={48} color={colors.dashboard.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.dashboard.textPrimary }]}>No loans found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.dashboard.textSecondary }]}>
              {search ? 'Try a different search term' : 'No loans in this category'}
            </Text>
          </View>
        ) : (
          searchedList.map((item, i) => {
            const isApp = 'purpose' in item;
            const expanded = expandedId === item.id;
            const status = isApp ? (item as LoanApplication).status : 'active';

            return (
              <View key={item.id} style={[styles.card, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
                <Pressable onPress={() => setExpandedId(expanded ? null : item.id)} style={({ pressed }) => pressed && styles.pressed}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardTitle, { color: colors.dashboard.textPrimary }]}>{item.title}</Text>
                      <Text style={[styles.cardId, { color: colors.dashboard.textSecondary }]}>{item.id}</Text>
                    </View>
                    <StatusBadge status={status} />
                  </View>

                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="cash-outline" size={14} color={colors.dashboard.textSecondary} />
                      <Text style={[styles.metaText, { color: colors.dashboard.textPrimary }]}>
                        ৳{(item.amount ?? 0).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={14} color={colors.dashboard.textSecondary} />
                      <Text style={[styles.metaText, { color: colors.dashboard.textPrimary }]}>{item.date}</Text>
                    </View>
                    {isApp && (
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={14} color={colors.dashboard.textSecondary} />
                        <Text style={[styles.metaText, { color: colors.dashboard.textPrimary }]}>{(item as LoanApplication).duration}</Text>
                      </View>
                    )}
                  </View>

                  {expanded && isApp && (
                    <View style={[styles.expandedArea, { borderTopColor: colors.dashboard.border }]}>
                      <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary }]}>Purpose</Text>
                      <Text style={[styles.expandedValue, { color: colors.dashboard.textPrimary }]}>{(item as LoanApplication).purpose}</Text>
                      <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary, marginTop: 10 }]}>EMI</Text>
                      <Text style={[styles.expandedValue, { color: colors.dashboard.textPrimary }]}>
                        ৳{(item as LoanApplication).emi.toLocaleString()} / {(item as LoanApplication).installmentType}
                      </Text>
                    </View>
                  )}

                  {expanded && !isApp && (
                    <View style={[styles.expandedArea, { borderTopColor: colors.dashboard.border }]}>
                      <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary }]}>Progress</Text>
                      <View style={styles.progressRow}>
                        <View style={[styles.progressBar, { backgroundColor: colors.dashboard.border }]}>
                          <View style={[styles.progressFill, { backgroundColor: colors.greenLight, width: `${item.progress ?? 0}%` }]} />
                        </View>
                        <Text style={[styles.progressText, { color: colors.greenLight }]}>{item.progress}%</Text>
                      </View>
                      <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary, marginTop: 10 }]}>Next Payment</Text>
                      <Text style={[styles.expandedValue, { color: colors.dashboard.textPrimary }]}>
                        ৳{(item.nextPaymentAmount ?? 0).toLocaleString()} on {item.nextPaymentDate}
                      </Text>
                    </View>
                  )}

                  <View style={styles.expandHint}>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.dashboard.textSecondary} />
                  </View>
                </Pressable>
              </View>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
  searchRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.md, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  filterRow: { flexDirection: 'row', borderRadius: borderRadius.md, borderWidth: 1, padding: 3, marginBottom: 14 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: borderRadius.sm, alignItems: 'center' },
  filterLabel: { fontSize: 11, fontWeight: '600' },
  card: { borderRadius: borderRadius.md, borderWidth: 1, ...shadows.cardSubtle, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14, paddingBottom: 8 },
  cardInfo: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardId: { fontSize: 11 },
  cardMeta: { flexDirection: 'row', gap: 16, paddingHorizontal: 14, paddingBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontWeight: '500' },
  expandedArea: { borderTopWidth: 1, padding: 14, paddingTop: 12 },
  expandedLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  expandedValue: { fontSize: 14, fontWeight: '500' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 14, fontWeight: '700' },
  expandHint: { alignItems: 'center', paddingBottom: 6 },
  emptyCard: { borderRadius: borderRadius.md, borderWidth: 1, alignItems: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
