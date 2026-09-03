import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useColors } from '@/features/officials/shared/constants/theme';
import { contentMaxWidthWide } from '@/features/officials/shared/constants/layout';
import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { fetchAuditLogs, type AuditLogItem, type AuditLogModule } from '@/features/officials/admin/services/admin-api';

const MODULE_FILTERS: AuditLogModule[] = ['All', 'Auth', 'FieldOfficer', 'Loan', 'User', 'Report', 'System'];
const PAGE_SIZE = 20;

const MODULE_COLOR: Record<string, string> = {
  Auth: '#8B5CF6',
  FieldOfficer: '#0EA5E9',
  Loan: '#22C55E',
  User: '#3B82F6',
  Report: '#F59E0B',
  System: '#A78BFA',
};
const MODULE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  Auth: 'log-in-outline',
  FieldOfficer: 'people-outline',
  Loan: 'wallet-outline',
  User: 'person-outline',
  Report: 'document-text-outline',
  System: 'settings-outline',
};
const STATUS_COLOR: Record<string, string> = { success: '#22C55E', pending: '#F59E0B', failed: '#EF4444' };
const AVATAR_COLORS = ['#047857', '#1D4ED8', '#7C3AED', '#B45309', '#BE185D', '#0D9488', '#4F46E5', '#C026D3'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.floor(Math.max(0, Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AuditLogsScreen() {
  const colors = useColors();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<AuditLogModule>('All');

  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const res = await fetchAuditLogs({
          module: activeFilter,
          search: search || undefined,
          page: 1,
          pageSize: PAGE_SIZE,
        });
        setItems(res.data.items);
        setPage(1);
        setTotalPages(res.data.pagination.totalPages);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load audit logs');
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeFilter, search],
  );

  useEffect(() => {
    const t = setTimeout(() => load('initial'), 0);
    return () => clearTimeout(t);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await fetchAuditLogs({ module: activeFilter, search: search || undefined, page: next, pageSize: PAGE_SIZE });
      setItems((prev) => [...prev, ...res.data.items]);
      setPage(next);
      setTotalPages(res.data.pagination.totalPages);
    } catch {
      // keep current
    } finally {
      setLoadingMore(false);
    }
  }, [activeFilter, search, page, totalPages, loadingMore]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.dashboard.bg }]}>
      <ScreenHeader title="Audit Logs" />

      <View style={[styles.searchRow, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.dashboard.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.dashboard.textPrimary }]}
          placeholder="Search by user or action..."
          placeholderTextColor={colors.dashboard.textSecondary}
          value={searchInput}
          onChangeText={setSearchInput}
        />
        {searchInput.length > 0 && (
          <Pressable onPress={() => setSearchInput('')}>
            <Ionicons name="close-circle" size={18} color={colors.dashboard.textSecondary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={colors.greenLight} />}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {MODULE_FILTERS.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterChip,
                { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border },
                activeFilter === filter && { backgroundColor: colors.greenLight, borderColor: colors.greenLight },
              ]}>
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.dashboard.textSecondary },
                  activeFilter === filter && { color: '#FFFFFF', fontWeight: '700' },
                ]}>
                {filter === 'FieldOfficer' ? 'Field Officer' : filter}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.greenLight} />
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.dashboard.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.dashboard.textPrimary }]}>{error}</Text>
            <Pressable onPress={() => load('initial')} style={[styles.retryBtn, { backgroundColor: colors.greenLight }]}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centerBox}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.dashboard.cardBg }]}>
              <Ionicons name="document-lock-outline" size={44} color={colors.dashboard.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.dashboard.textPrimary }]}>No logs found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.dashboard.textSecondary }]}>
              {search ? 'Try adjusting your search' : 'No audit activity recorded for this filter'}
            </Text>
          </View>
        ) : (
          <>
            {items.map((log) => {
              const actor = log.actor_name || 'System';
              const color = avatarColor(actor);
              const mod = log.module || 'System';
              return (
                <View key={log.id} style={[styles.logCard, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
                  <View style={styles.logTop}>
                    <View style={[styles.avatar, { backgroundColor: color + '18' }]}>
                      <Text style={[styles.avatarText, { color }]}>{initials(actor)}</Text>
                    </View>
                    <View style={styles.logInfo}>
                      <Text style={[styles.logUser, { color: colors.dashboard.textPrimary }]}>{actor}</Text>
                      <Text style={[styles.logAction, { color: colors.dashboard.textSecondary }]}>{log.action}</Text>
                    </View>
                  </View>
                  <View style={styles.logBottom}>
                    <View style={[styles.moduleBadge, { backgroundColor: (MODULE_COLOR[mod] ?? '#A78BFA') + '20' }]}>
                      <Ionicons name={MODULE_ICON[mod] ?? 'ellipse-outline'} size={12} color={MODULE_COLOR[mod] ?? '#A78BFA'} />
                      <Text style={[styles.moduleText, { color: MODULE_COLOR[mod] ?? '#A78BFA' }]}>
                        {mod === 'FieldOfficer' ? 'Field Officer' : mod}
                      </Text>
                    </View>
                    <Text style={[styles.timestamp, { color: colors.dashboard.textSecondary }]}>{timeAgo(log.created_at)}</Text>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[log.status] ?? colors.dashboard.textSecondary }]} />
                  </View>
                </View>
              );
            })}
            {page < totalPages && (
              <Pressable onPress={loadMore} style={[styles.loadMore, { borderColor: colors.dashboard.border, backgroundColor: colors.dashboard.cardBg }]}>
                {loadingMore ? <ActivityIndicator color={colors.greenLight} size="small" /> : <Text style={[styles.loadMoreText, { color: colors.greenLight }]}>Load more</Text>}
              </Pressable>
            )}
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
  searchRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 16, marginTop: 12, gap: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16, paddingRight: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 10 },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  logCard: { borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1 },
  logTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700' },
  logInfo: { flex: 1 },
  logUser: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  logAction: { fontSize: 13, lineHeight: 18 },
  logBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moduleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  moduleText: { fontSize: 11, fontWeight: '700' },
  timestamp: { fontSize: 11, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  loadMore: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  loadMoreText: { fontSize: 13, fontWeight: '700' },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
});
