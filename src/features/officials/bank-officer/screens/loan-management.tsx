import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { StatusBadge } from '@/features/officials/shared/components/status-badge';
import { borderRadius, contentMaxWidth, shadows } from '@/features/officials/shared/constants/layout';
import { useColors } from '@/features/officials/shared/constants/theme';
import { farmerName, num, useBankReview } from '@/features/officials/bank-officer/hooks/useBankReview';

type FilterTab = 'all' | 'pending' | 'under_review' | 'approved' | 'rejected';

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'under_review', label: 'Reviewing' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function LoanManagementScreen() {
  const colors = useColors();
  const { rows, loading, refreshing, error, refresh } = useBankReview();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const term = search.trim().toLowerCase();
  const list = rows
    .filter(r => (activeFilter === 'all' ? true : r.status === activeFilter))
    .filter(r =>
      !term ||
      (r.title ?? '').toLowerCase().includes(term) ||
      farmerName(r).toLowerCase().includes(term) ||
      (r.farmer?.farmer_id ?? '').toLowerCase().includes(term),
    );

  return (
    <View style={[styles.screen, { backgroundColor: colors.dashboard.bg }]}>
      <ScreenHeader title="Loan Management" />
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.dashboard.textPrimary }]}
            placeholder="Search by title or farmer..."
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.greenLight} />}
      >
        <View style={[styles.filterRow, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          {FILTERS.map((f) => {
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

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.dashboard.redDown + '18', borderColor: colors.dashboard.redDown }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.dashboard.redDown} />
            <Text style={[styles.errorText, { color: colors.dashboard.redDown }]}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={colors.greenLight} /></View>
        ) : list.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
            <Ionicons name="cash-outline" size={48} color={colors.dashboard.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.dashboard.textPrimary }]}>No loans found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.dashboard.textSecondary }]}>
              {search ? 'Try a different search term' : 'Nothing in this category'}
            </Text>
          </View>
        ) : (
          list.map((row) => {
            const expanded = expandedId === row.id;
            return (
              <View key={row.id} style={[styles.card, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
                <Pressable onPress={() => setExpandedId(expanded ? null : row.id)} style={({ pressed }) => pressed && styles.pressed}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardTitle, { color: colors.dashboard.textPrimary }]}>{row.title ?? 'Loan application'}</Text>
                      <Text style={[styles.cardId, { color: colors.dashboard.textSecondary }]}>{farmerName(row)}</Text>
                    </View>
                    <StatusBadge status={row.status === 'under_review' ? 'pending' : (row.status as any) ?? 'pending'} />
                  </View>

                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="cash-outline" size={14} color={colors.dashboard.textSecondary} />
                      <Text style={[styles.metaText, { color: colors.dashboard.textPrimary }]}>
                        ৳{num(row.approved_amount ?? row.amount).toLocaleString()}
                      </Text>
                    </View>
                    {row.duration ? (
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={14} color={colors.dashboard.textSecondary} />
                        <Text style={[styles.metaText, { color: colors.dashboard.textPrimary }]}>{row.duration}</Text>
                      </View>
                    ) : null}
                    <View style={styles.metaItem}>
                      <Ionicons name="shield-checkmark-outline" size={14} color={colors.dashboard.textSecondary} />
                      <Text style={[styles.metaText, { color: colors.dashboard.textPrimary }]}>{row.verification_status ?? 'pending'}</Text>
                    </View>
                  </View>

                  {expanded && (
                    <View style={[styles.expandedArea, { borderTopColor: colors.dashboard.border }]}>
                      {row.purpose ? (
                        <>
                          <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary }]}>Purpose</Text>
                          <Text style={[styles.expandedValue, { color: colors.dashboard.textPrimary }]}>{row.purpose}</Text>
                        </>
                      ) : null}
                      <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary, marginTop: 10 }]}>Requested</Text>
                      <Text style={[styles.expandedValue, { color: colors.dashboard.textPrimary }]}>৳{num(row.amount).toLocaleString()}</Text>
                      {row.decision_notes ? (
                        <>
                          <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary, marginTop: 10 }]}>Decision notes</Text>
                          <Text style={[styles.expandedValue, { color: colors.dashboard.textPrimary }]}>{row.decision_notes}</Text>
                        </>
                      ) : null}
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
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: borderRadius.sm, borderWidth: 1, marginBottom: 12 },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },
  loadingBox: { padding: 40, alignItems: 'center' },
  card: { borderRadius: borderRadius.md, borderWidth: 1, ...shadows.cardSubtle, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14, paddingBottom: 8 },
  cardInfo: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardId: { fontSize: 11 },
  cardMeta: { flexDirection: 'row', gap: 16, paddingHorizontal: 14, paddingBottom: 8, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontWeight: '500' },
  expandedArea: { borderTopWidth: 1, padding: 14, paddingTop: 12 },
  expandedLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  expandedValue: { fontSize: 14, fontWeight: '500' },
  expandHint: { alignItems: 'center', paddingBottom: 6 },
  emptyCard: { borderRadius: borderRadius.md, borderWidth: 1, alignItems: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
