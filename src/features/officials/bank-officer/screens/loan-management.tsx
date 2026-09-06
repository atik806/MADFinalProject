import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { StatusBadge, type StatusType } from '@/features/officials/shared/components/status-badge';
import { borderRadius, contentMaxWidth, shadows } from '@/features/officials/shared/constants/layout';
import { useColors } from '@/features/officials/shared/constants/theme';
import { api } from '@/lib/api';
import type { ApiResponse, BankOfficerQueueRow, ListResult, LoanTimelineStep } from '@/lib/api-types';

// The bank's whole shared queue — every application a field officer has
// FORWARDED, newest handoff first. Drawn from /api/bank-officer/loans (a
// bank-officer token is required; the backend avoids listing anything that was
// never handed to the bank).

const FILTERS: { key: 'all' | 'pending' | 'under_review' | 'approved' | 'rejected'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_AS_BADGE = (status?: string): StatusType =>
  BANK_STATUSES.has(status ?? '') ? (status as StatusType) : 'pending';

const BANK_STATUSES = new Set(['pending', 'under_review', 'approved', 'rejected', 'active']);

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const d = new Date(String(value));
  if (!Number.isFinite(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const timelineFromRow = (row: BankOfficerQueueRow): LoanTimelineStep[] => [
  { step: 1, label: 'Application Submitted', completed: true },
  { step: 2, label: 'Field Officer Verified', completed: String(row.verification_status ?? '') === 'verified' },
  { step: 3, label: 'Forwarded to Bank', completed: Boolean(row.forwarded_at) },
  {
    step: 4,
    label: row.status === 'approved' ? 'Approved' : row.status === 'rejected' ? 'Rejected' : 'Bank Decision',
    completed: Boolean(row.decision_at),
  },
];

export default function LoanManagementScreen() {
  const colors = useColors();
  const [items, setItems] = useState<BankOfficerQueueRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      // The shared bank queue — server-scoped, newest forwarded application
      // first, farmer + field officer summaries embedded per row.
      const res = await api.get<ApiResponse<ListResult<BankOfficerQueueRow>>>('/api/bank-officer/loans?pageSize=100');
      setItems(res?.data?.items ?? []);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message ?? 'Could not load loan applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadQueue(), 0);
    return () => clearTimeout(timer);
  }, [loadQueue]);

  const filtered = items.filter((item) => {
    if (activeFilter !== 'all' && item.status !== activeFilter) return false;
    const farmerName = item.farmer?.name_en ?? item.farmer?.name_bn ?? '';
    const haystack = `${farmerName} ${item.title} ${item.id}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const bg = colors.dashboard.bg;
  const cardBg = colors.dashboard.cardBg;
  const textPrimary = colors.dashboard.textPrimary;
  const textSecondary = colors.dashboard.textSecondary;
  const border = colors.dashboard.border;

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <ScreenHeader title="Loan Management" />
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor: border }]}>
          <Ionicons name="search-outline" size={18} color={textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: textPrimary }]}
            placeholder="Search farmer, loan or ID..."
            placeholderTextColor={textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={[styles.filterRow, { backgroundColor: cardBg, borderColor: border }]}>
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => { setActiveFilter(f.key); setExpandedId(null); }}
                style={[styles.filterBtn, active && { backgroundColor: colors.greenLight + '15' }]}>
                <Text style={[styles.filterLabel, { color: active ? colors.greenLight : textSecondary }, active && { fontWeight: '700' }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading && !loadError ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.emptyInner}>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>Loading applications…</Text>
            </View>
          </View>
        ) : loadError ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.dashboard.redDown }]}>
            <View style={styles.emptyInner}>
              <Ionicons name="cloud-offline-outline" size={48} color={colors.dashboard.redDown} />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>Could not load applications</Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>{loadError}</Text>
            </View>
          </View>
        ) : filtered.length === 0 ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.emptyInner}>
              <Ionicons name="document-text-outline" size={48} color={textSecondary} />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>No applications found</Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                {search ? 'Try a different search term' : 'No forwarded applications in this category'}
              </Text>
            </View>
          </View>
        ) : (
          filtered.map((item) => {
            const expanded = expandedId === item.id;
            const farmerName = item.farmer?.name_en ?? item.farmer?.name_bn ?? 'Farmer';
            const timeline = timelineFromRow(item);

            return (
              <View key={item.id} style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
                <Pressable onPress={() => setExpandedId(expanded ? null : item.id)} style={({ pressed }) => pressed && styles.pressed}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardTitle, { color: textPrimary }]}>{farmerName}</Text>
                      <Text style={[styles.cardSubtitle, { color: textSecondary }]}>{item.title}</Text>
                    </View>
                    <StatusBadge status={STATUS_AS_BADGE(item.status)} />
                  </View>

                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="cash-outline" size={14} color={textSecondary} />
                      <Text style={[styles.metaText, { color: textPrimary }]}>৳{(item.amount ?? 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={14} color={textSecondary} />
                      <Text style={[styles.metaText, { color: textPrimary }]}>Forwarded {formatDate(item.forwarded_at)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={14} color={textSecondary} />
                      <Text style={[styles.metaText, { color: textPrimary }]}>{item.duration ?? '—'}</Text>
                    </View>
                  </View>

                  {expanded && (
                    <View style={[styles.expandedArea, { borderTopColor: border }]}>
                      <Text style={[styles.expandedLabel, { color: textSecondary }]}>Bank Decision Timeline</Text>
                      {timeline.map((entry, ti) => {
                        const done = entry.completed;
                        const dotColor = done ? colors.greenLight : textSecondary;
                        const lineColor = done ? colors.greenLight + '40' : border;
                        return (
                          <View key={ti} style={styles.timelineRow}>
                            <View style={styles.timelineDotCol}>
                              <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
                              {ti < timeline.length - 1 && <View style={[styles.timelineLine, { backgroundColor: lineColor }]} />}
                            </View>
                            <Text style={[styles.timelineLabel, { color: done ? textPrimary : textSecondary }]}>
                              {entry.label}
                            </Text>
                          </View>
                        );
                      })}

                      <Text style={[styles.expandedLabel, { color: textSecondary, marginTop: 14 }]}>Application</Text>
                      <View style={styles.finRow}>
                        <Text style={[styles.finKey, { color: textSecondary }]}>Purpose</Text>
                        <Text style={[styles.finVal, { color: textPrimary }]}>{item.purpose ?? '—'}</Text>
                      </View>
                      <View style={styles.finRow}>
                        <Text style={[styles.finKey, { color: textSecondary }]}>Requested Amount</Text>
                        <Text style={[styles.finVal, { color: textPrimary }]}>৳{(item.amount ?? 0).toLocaleString()}</Text>
                      </View>
                      <View style={styles.finRow}>
                        <Text style={[styles.finKey, { color: textSecondary }]}>Officer Recommendation</Text>
                        <Text style={[styles.finVal, { color: textPrimary }]}>৳{(item.recommended_amount ?? item.amount ?? 0).toLocaleString()}</Text>
                      </View>
                      {item.approved_amount != null && item.status === 'approved' && (
                        <View style={styles.finRow}>
                          <Text style={[styles.finKey, { color: textSecondary }]}>Approved Amount</Text>
                          <Text style={[styles.finVal, { color: colors.greenLight }]}>৳{Number(item.approved_amount).toLocaleString()}</Text>
                        </View>
                      )}
                      {item.decision_notes ? (
                        <View style={styles.finRow}>
                          <Text style={[styles.finKey, { color: textSecondary }]}>Decision Notes</Text>
                          <Text style={[styles.finVal, { color: textPrimary, flex: 1, textAlign: 'right' }]}>{item.decision_notes}</Text>
                        </View>
                      ) : null}
                      {item.field_officer ? (
                        <View style={styles.finRow}>
                          <Text style={[styles.finKey, { color: textSecondary }]}>Field Officer</Text>
                          <Text style={[styles.finVal, { color: textPrimary }]}>
                            {item.field_officer.name_en ?? item.field_officer.name_bn ?? '—'}
                          </Text>
                        </View>
                      ) : null}
                      {item.farmer?.phone || item.farmer?.district ? (
                        <View style={styles.finRow}>
                          <Text style={[styles.finKey, { color: textSecondary }]}>Farmer</Text>
                          <Text style={[styles.finVal, { color: textPrimary }]}>
                            {[item.farmer?.district, item.farmer?.phone].filter(Boolean).join(' • ') || '—'}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  <View style={styles.expandHint}>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={textSecondary} />
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
  filterLabel: { fontSize: 10, fontWeight: '600' },
  card: { borderRadius: borderRadius.md, borderWidth: 1, ...shadows.cardSubtle, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14, paddingBottom: 8 },
  cardInfo: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardSubtitle: { fontSize: 12 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, rowGap: 4, paddingHorizontal: 14, paddingBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontWeight: '500' },
  expandedArea: { borderTopWidth: 1, padding: 14, paddingTop: 12 },
  expandedLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  timelineRow: { flexDirection: 'row', marginBottom: 4 },
  timelineDotCol: { width: 20, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, marginTop: 2 },
  timelineLabel: { fontSize: 13, fontWeight: '500', paddingBottom: 12, paddingLeft: 6 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 16 },
  finKey: { fontSize: 13 },
  finVal: { fontSize: 13, fontWeight: '600' },
  expandHint: { alignItems: 'center', paddingBottom: 6 },
  emptyInner: { alignItems: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});