import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useColors } from '@/features/officials/shared/constants/theme';
import { contentMaxWidthWide } from '@/features/officials/shared/constants/layout';
import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { api } from '@/lib/api';
import type { ApiResponse, AuditLogRow, ListResult } from '@/lib/api-types';

type LogStatus = 'success' | 'pending' | 'failed';
type LogModule = 'User' | 'Loan' | 'System';

type LogEntry = {
  id: string;
  user: string;
  action: string;
  module: LogModule;
  time: string;
  status: LogStatus;
};

// Map a backend audit_logs row to the entry card the screen renders. The
// backend writes module values like Auth / FieldOfficer / BankOfficer /
// Admin — they collapse to the screen's three visual categories.
const MODULE_TO_CATEGORY: Record<string, LogModule> = {
  auth: 'User',
  admin: 'User',
  fieldofficer: 'Loan',
  bankofficer: 'Loan',
  loan: 'Loan',
  system: 'System',
};

const timeAgo = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

const logFromRow = (row: AuditLogRow): LogEntry => {
  const rawStatus = String(row.status ?? 'success').toLowerCase();
  const status: LogStatus = rawStatus === 'failure' || rawStatus === 'failed' ? 'failed' : rawStatus === 'pending' ? 'pending' : 'success';
  return {
    id: String(row.id),
    user: row.actor_name ?? 'System',
    action: row.action ?? '',
    module: MODULE_TO_CATEGORY[String(row.module ?? '').replace(/[\s_-]/g, '').toLowerCase()] ?? 'System',
    time: timeAgo(String(row.created_at ?? '')),
    status,
  };
};

const MODULE_FILTERS = ['All', 'User', 'Loan', 'System'] as const;
type ModuleFilter = (typeof MODULE_FILTERS)[number];

const MODULE_COLORS: Record<LogModule, string> = {
  User: '#3B82F6',
  Loan: '#22C55E',
  System: '#A78BFA',
};

const STATUS_CONFIG: Record<LogStatus, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  success: { color: '#22C55E', bg: '#22C55E20', icon: 'checkmark-circle', label: 'Success' },
  pending: { color: '#F59E0B', bg: '#F59E0B20', icon: 'time', label: 'Pending' },
  failed: { color: '#EF4444', bg: '#EF444420', icon: 'close-circle', label: 'Failed' },
};

const AVATAR_COLORS = ['#047857', '#1D4ED8', '#7C3AED', '#B45309', '#BE185D', '#0D9488', '#4F46E5', '#C026D3'];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function AuditLogsScreen() {
  const colors = useColors();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ModuleFilter>('All');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<ListResult<AuditLogRow>>>('/api/admin/audit?pageSize=100');
      setLogs((res?.data?.items ?? []).map(logFromRow));
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message ?? 'Could not load audit logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Data fetch on mount. The kickoff is deferred out of the effect body;
    // state updates happen only after the fetch resolves.
    const timer = setTimeout(() => void loadLogs(), 0);
    return () => clearTimeout(timer);
  }, [loadLogs]);

  const filtered = logs.filter((log) => {
    const moduleMatch = activeFilter === 'All' || log.module === activeFilter;
    const searchMatch = !search ||
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());
    return moduleMatch && searchMatch;
  });

  return (
    <View style={[styles.screen, { backgroundColor: colors.dashboard.bg }]}>
      <ScreenHeader title="Audit Logs" />

      <View style={[styles.searchRow, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.dashboard.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.dashboard.textPrimary }]}
          placeholder="Search by user or action..."
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

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        <View style={styles.filterRow}>
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
                {filter}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.dashboard.cardBg, marginTop: 24, alignSelf: 'center' }]}>
            <ActivityIndicator color={colors.greenLight} />
          </View>
        ) : loadError ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.dashboard.cardBg }]}>
              <Ionicons name="cloud-offline-outline" size={48} color={colors.dashboard.redDown} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.dashboard.textPrimary }]}>Could not load audit logs</Text>
            <Text style={[styles.emptySubtitle, { color: colors.dashboard.textSecondary }]}>{loadError}</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.dashboard.cardBg }]}>
              <Ionicons name="document-lock-outline" size={48} color={colors.dashboard.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.dashboard.textPrimary }]}>No logs found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.dashboard.textSecondary }]}>
              {search ? 'Try adjusting your search query' : 'No audit logs for this module'}
            </Text>
          </View>
        ) : (
          filtered.map((log) => {
            const statusCfg = STATUS_CONFIG[log.status];
            const avatarColor = getAvatarColor(log.user);

            return (
              <View key={log.id} style={[styles.logCard, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
                <View style={styles.logTop}>
                  <View style={[styles.avatar, { backgroundColor: avatarColor + '18' }]}>
                    <Text style={[styles.avatarText, { color: avatarColor }]}>{getInitials(log.user)}</Text>
                  </View>
                  <View style={styles.logInfo}>
                    <Text style={[styles.logUser, { color: colors.dashboard.textPrimary }]}>{log.user}</Text>
                    <Text style={[styles.logAction, { color: colors.dashboard.textSecondary }]}>{log.action}</Text>
                  </View>
                </View>

                <View style={styles.logBottom}>
                  <View style={[styles.moduleBadge, { backgroundColor: MODULE_COLORS[log.module] + '20' }]}>
                    <Ionicons
                      name={log.module === 'User' ? 'person-outline' : log.module === 'Loan' ? 'wallet-outline' : 'settings-outline'}
                      size={12}
                      color={MODULE_COLORS[log.module]}
                    />
                    <Text style={[styles.moduleText, { color: MODULE_COLORS[log.module] }]}>{log.module}</Text>
                  </View>

                  <Text style={[styles.timestamp, { color: colors.dashboard.textSecondary }]}>{log.time}</Text>

                  <View style={[styles.statusDot, { backgroundColor: statusCfg.color }]} />
                </View>
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
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    maxWidth: contentMaxWidthWide,
    alignSelf: 'center',
    width: '100%',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  logCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  logTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  logInfo: {
    flex: 1,
  },
  logUser: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  logAction: {
    fontSize: 13,
    lineHeight: 18,
  },
  logBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moduleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  moduleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 11,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
