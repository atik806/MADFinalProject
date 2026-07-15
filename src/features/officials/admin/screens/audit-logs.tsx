import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useColors } from '@/features/officials/shared/constants/theme';
import { contentMaxWidthWide } from '@/features/officials/shared/constants/layout';
import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { MOCK_LOGS, MODULE_FILTERS, MODULE_COLORS, STATUS_CONFIG, AVATAR_COLORS } from '@/data';
import type { LogEntry, LogStatus, LogModule } from '@/data';

type ModuleFilter = (typeof MODULE_FILTERS)[number];

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

  const filtered = MOCK_LOGS.filter((log) => {
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

        {filtered.length === 0 ? (
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
