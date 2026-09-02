import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionCard } from '@/features/officials/shared/components/action-card';
import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { StatCard } from '@/features/officials/shared/components/stat-card';
import { StatusBadge } from '@/features/officials/shared/components/status-badge';
import { borderRadius, contentMaxWidth, shadows } from '@/features/officials/shared/constants/layout';
import { useColors } from '@/features/officials/shared/constants/theme';
import { api } from '@/lib/api';
import type { ApiResponse, FieldVisitRow, ListResult, ProfileRow } from '@/lib/api-types';

type Farmer = {
  id: string;
  name: string;
  location: string;
  crop: string;
  status: 'verified' | 'pending' | 'rejected';
};

// Map an assigned-farmer profile row to the card the dashboard renders.
const farmerFromRow = (row: ProfileRow): Farmer => ({
  id: String(row.id),
  name: row.name_en ?? row.name_bn ?? 'Farmer',
  location: [row.village, row.district].filter(Boolean).join(', ') || row.location || '—',
  crop: row.primary_crop ?? '—',
  status: row.is_verified ? 'verified' : 'pending',
});

const QUICK_ACTIONS = [
  { icon: 'person-add-outline' as const, iconBg: '#3A9BD5', title: 'New Farmer\nOnboarding' },
  { icon: 'location-outline' as const, iconBg: '#1A8F5C', title: 'Record Visit' },
  { icon: 'document-text-outline' as const, iconBg: '#7C3AED', title: 'Submit\nApplication' },
  { icon: 'cloud-upload-outline' as const, iconBg: '#F59E0B', title: 'Upload\nDocuments' },
];

// A scheduled visit, mapped from the officer's visits endpoint. Time is the
// visit date; type is always 'Visit' (the backend has no visit taxonomy).
type ScheduledVisit = {
  time: string;
  title: string;
  location: string;
  type: string;
};

const visitFromRow = (row: FieldVisitRow): ScheduledVisit => {
  const d = new Date(String(row.visit_date ?? row.created_at ?? ''));
  const time = Number.isFinite(d.getTime())
    ? d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : '—';
  return {
    time,
    title: row.purpose ? `Field Visit — ${row.purpose}` : 'Field Visit',
    location: row.location ?? '—',
    type: 'Visit',
  };
};

export default function FieldOfficerDashboardScreen() {
  const router = useRouter();
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scheduledVisits, setScheduledVisits] = useState<ScheduledVisit[]>([]);

  const loadDashboard = useCallback(async () => {
    try {
      // Assigned farmers: the officer's own list (server-scoped by token).
      const farmersRes = await api.get<ApiResponse<ListResult<ProfileRow>>>('/api/field-officer/farmers?pageSize=100');
      setFarmers((farmersRes?.data?.items ?? []).map(farmerFromRow));
      // Today's view: scheduled + in-progress visits become the schedule list.
      const visitsRes = await api.get<ApiResponse<ListResult<FieldVisitRow>>>('/api/field-officer/visits?pageSize=100');
      const visitRows: FieldVisitRow[] = visitsRes?.data?.items ?? [];
      setScheduledVisits(visitRows.filter((v) => ['scheduled', 'in-progress'].includes(String(v.status ?? ''))).map(visitFromRow));
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message ?? 'Could not load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Data fetch on mount. The kickoff is deferred out of the effect body;
    // state updates happen only after the fetch resolves.
    const timer = setTimeout(() => void loadDashboard(), 0);
    return () => clearTimeout(timer);
  }, [loadDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard().finally(() => setRefreshing(false));
  }, [loadDashboard]);

  const bg = colors.dashboard.bg;
  const cardBg = colors.dashboard.cardBg;
  const textPrimary = colors.dashboard.textPrimary;
  const textSecondary = colors.dashboard.textSecondary;
  const border = colors.dashboard.border;

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: bg }]}>
        <ScreenHeader title="Field Officer Dashboard" />
        <View style={styles.loadingContainer}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: cardBg, borderColor: border }]}>
              <ActivityIndicator color={colors.greenLight} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <ScreenHeader title="Field Officer Dashboard" />
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
              <Text style={styles.heroName}>Field Officer</Text>
              <Text style={styles.heroRole}>Field Officer • SOFOL</Text>
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            <StatCard hero icon="people" iconBg="#FFFFFF" value={String(farmers.length)} label="Assigned Farmers" />
            <StatCard hero icon="checkmark-circle" iconBg="#FFFFFF" value={String(scheduledVisits.length)} label="Scheduled Visits" />
          </View>
        </View>

        {/* Overview Stats */}
        <Text style={[styles.sectionLabel, { color: textSecondary }]}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="people-outline" iconBg="#3A9BD5" value="12" label="Assigned Farmers" sub="5 new this month" />
          <StatCard icon="time-outline" iconBg="#F59E0B" value="5" label="Pending Verifications" sub="3 overdue" />
          <StatCard icon="location-outline" iconBg="#1A8F5C" value="3" label="Field Visits Today" />
          <StatCard icon="document-text-outline" iconBg="#7C3AED" value="8" label="Applications Forwarded" />
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionLabel, { color: textSecondary }]}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map((action, i) => (
            <ActionCard
              key={i}
              icon={action.icon}
              iconBg={action.iconBg}
              title={action.title}
              onPress={() => {
                if (i === 0) router.push('/officials/users');
                else if (i === 1) router.push('/officials/visits');
                else if (i === 2) router.push('/officials/applications');
                else if (i === 3) Alert.alert('Success', 'Documents uploaded successfully');
              }}
            />
          ))}
        </View>

        {/* Today&apos;s Schedule */}
        <Text style={[styles.sectionLabel, { color: textSecondary }]}>Today&apos;s Schedule</Text>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          {scheduledVisits.length === 0 ? (
            <View style={styles.emptyInner}>
              <Ionicons name="calendar-outline" size={32} color={textSecondary} />
              <Text style={[styles.emptyInnerText, { color: textSecondary }]}>No tasks scheduled</Text>
            </View>
          ) : (
            scheduledVisits.map((task, i) => (
              <View key={i}>
                <View style={styles.taskRow}>
                  <View style={styles.taskTimeCol}>
                    <Text style={[styles.taskTime, { color: textPrimary }]}>{task.time}</Text>
                    <View
                      style={[
                        styles.taskBadge,
                        { backgroundColor: task.type === 'Visit' ? colors.greenLight + '20' : colors.blueLight + '20' },
                      ]}>
                      <Text
                        style={[
                          styles.taskBadgeText,
                          { color: task.type === 'Visit' ? colors.greenLight : colors.blueLight },
                        ]}>
                        {task.type}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.taskInfoCol}>
                    <Text style={[styles.taskTitle, { color: textPrimary }]}>{task.title}</Text>
                    <Text style={[styles.taskLocation, { color: textSecondary }]}>{task.location}</Text>
                  </View>
                </View>
                {i < scheduledVisits.length - 1 && <View style={[styles.divider, { backgroundColor: border }]} />}
              </View>
             ))
          )}
        </View>

        {/* My Assigned Farmers */}
        <Text style={[styles.sectionLabel, { color: textSecondary }]}>My Assigned Farmers</Text>
        {farmers.length === 0 ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.emptyInner}>
              <Ionicons name="people-outline" size={40} color={textSecondary} />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>No assigned farmers</Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>Farmers assigned to you will appear here</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            {farmers.map((farmer, i) => (
              <Pressable key={farmer.id} onPress={() => router.push('/officials/users')} style={({ pressed }) => pressed && styles.pressed}>
                <View style={styles.farmerRow}>
                  <Ionicons
                    name="person-circle"
                    size={42}
                    color={
                      farmer.status === 'verified'
                        ? colors.greenLight
                        : farmer.status === 'pending'
                          ? colors.blueLight
                          : colors.dashboard.redDown
                    }
                  />
                  <View style={styles.farmerInfo}>
                    <Text style={[styles.farmerName, { color: textPrimary }]}>{farmer.name}</Text>
                    <Text style={[styles.farmerDetail, { color: textSecondary }]}>
                      <Ionicons name="location-outline" size={12} color={textSecondary} /> {farmer.location}
                    </Text>
                    <Text style={[styles.farmerDetail, { color: textSecondary }]}>{farmer.crop}</Text>
                  </View>
                  <StatusBadge status={farmer.status} />
                </View>
                {i < farmers.length - 1 && <View style={[styles.divider, { backgroundColor: border }]} />}
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  skeletonCard: {
    height: 80,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextCol: {
    flex: 1,
  },
  heroGreeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  heroName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroRole: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    ...shadows.cardSubtle,
    marginBottom: 4,
  },
  taskRow: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
  },
  taskTimeCol: {
    width: 80,
    alignItems: 'flex-start',
  },
  taskTime: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  taskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  taskBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  taskInfoCol: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  taskLocation: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
  },
  farmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  farmerInfo: {
    flex: 1,
  },
  farmerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  farmerDetail: {
    fontSize: 12,
  },
  emptyInner: {
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  emptyInnerText: {
    fontSize: 14,
  },
  pressed: {
    opacity: 0.7,
  },
});
