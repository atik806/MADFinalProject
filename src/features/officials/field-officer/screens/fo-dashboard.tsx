import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { StatCard } from '@/features/officials/shared/components/stat-card';
import { StatusBadge } from '@/features/officials/shared/components/status-badge';
import { borderRadius, contentMaxWidth, shadows } from '@/features/officials/shared/constants/layout';
import { useColors } from '@/features/officials/shared/constants/theme';
import { MOCK_FARMERS, QUICK_ACTIONS, SCHEDULED_TASKS } from '@/data';

type Farmer = {
  id: string;
  name: string;
  location: string;
  crop: string;
  status: 'verified' | 'pending' | 'rejected';
};

export default function FieldOfficerDashboardScreen() {
  const router = useRouter();
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

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
        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.deepGreen }]}>
          <View style={styles.heroRow}>
            <View style={styles.heroAvatar}>
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroGreeting}>Good morning,</Text>
              <Text style={styles.heroName}>Mohammad Rahim</Text>
              <Text style={styles.heroRole}>Field Officer • Bhola</Text>
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            <StatCard hero icon="people" iconBg="#FFFFFF" value="12" label="Assigned Farmers" trend="+2" trendLabel="this wk" />
            <StatCard hero icon="checkmark-circle" iconBg="#FFFFFF" value="5" label="Pending Verifications" />
          </View>
        </View>
        {/* Overview Card */}
        <Text style={[styles.sectionLabel, { color: textSecondary }]}>Overview</Text>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <View style={[styles.overviewIcon, { backgroundColor: '#3A9BD520' }]}>
                <Ionicons name="people-outline" size={22} color="#3A9BD5" />
              </View>
              <Text style={[styles.overviewValue, { color: textPrimary }]}>12</Text>
              <Text style={[styles.overviewLabel, { color: textSecondary }]}>Assigned Farmers</Text>
            </View>
            <View style={styles.overviewItem}>
              <View style={[styles.overviewIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="time-outline" size={22} color="#F59E0B" />
              </View>
              <Text style={[styles.overviewValue, { color: textPrimary }]}>5</Text>
              <Text style={[styles.overviewLabel, { color: textSecondary }]}>Pending Verifications</Text>
            </View>
          </View>
          <View style={[styles.overviewDivider, { backgroundColor: border }]} />
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <View style={[styles.overviewIcon, { backgroundColor: '#1A8F5C20' }]}>
                <Ionicons name="location-outline" size={22} color="#1A8F5C" />
              </View>
              <Text style={[styles.overviewValue, { color: textPrimary }]}>3</Text>
              <Text style={[styles.overviewLabel, { color: textSecondary }]}>Field Visits Today</Text>
            </View>
            <View style={styles.overviewItem}>
              <View style={[styles.overviewIcon, { backgroundColor: '#7C3AED20' }]}>
                <Ionicons name="document-text-outline" size={22} color="#7C3AED" />
              </View>
              <Text style={[styles.overviewValue, { color: textPrimary }]}>8</Text>
              <Text style={[styles.overviewLabel, { color: textSecondary }]}>Applications Forwarded</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Card */}
        <Text style={[styles.sectionLabel, { color: textSecondary }]}>Quick Actions</Text>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.overviewRow}>
            {QUICK_ACTIONS.slice(0, 2).map((action, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [styles.quickActionItem, pressed && styles.pressed]}
                onPress={() => {
                  if (i === 0) router.push('/officials/users');
                  else if (i === 1) router.push('/officials/visits');
                }}
              >
                <View style={[styles.overviewIcon, { backgroundColor: action.iconBg + '20' }]}>
                  <Ionicons name={action.icon} size={22} color={action.iconBg} />
                </View>
                <Text style={[styles.overviewLabel, { color: textPrimary }]}>{action.title}</Text>
              </Pressable>
            ))}
          </View>
          <View style={[styles.overviewDivider, { backgroundColor: border }]} />
          <View style={styles.overviewRow}>
            {QUICK_ACTIONS.slice(2, 4).map((action, i) => (
              <Pressable
                key={i + 2}
                style={({ pressed }) => [styles.quickActionItem, pressed && styles.pressed]}
                onPress={() => {
                  if (i === 0) router.push('/officials/applications');
                  else if (i === 1) Alert.alert('Success', 'Documents uploaded successfully');
                }}
              >
                <View style={[styles.overviewIcon, { backgroundColor: action.iconBg + '20' }]}>
                  <Ionicons name={action.icon} size={22} color={action.iconBg} />
                </View>
                <Text style={[styles.overviewLabel, { color: textPrimary }]}>{action.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Today&apos;s Schedule */}
        <Text style={[styles.sectionLabel, { color: textSecondary }]}>Today&apos;s Schedule</Text>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          {SCHEDULED_TASKS.length === 0 ? (
            <View style={styles.emptyInner}>
              <Ionicons name="calendar-outline" size={32} color={textSecondary} />
              <Text style={[styles.emptyInnerText, { color: textSecondary }]}>No tasks scheduled</Text>
            </View>
          ) : (
            SCHEDULED_TASKS.map((task, i) => (
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
                {i < SCHEDULED_TASKS.length - 1 && <View style={[styles.divider, { backgroundColor: border }]} />}
              </View>
            ))
          )}
        </View>

        {/* My Assigned Farmers */}
        <Text style={[styles.sectionLabel, { color: textSecondary }]}>My Assigned Farmers</Text>
        {MOCK_FARMERS.length === 0 ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.emptyInner}>
              <Ionicons name="people-outline" size={40} color={textSecondary} />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>No assigned farmers</Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>Farmers assigned to you will appear here</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            {MOCK_FARMERS.map((farmer, i) => (
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
                {i < MOCK_FARMERS.length - 1 && <View style={[styles.divider, { backgroundColor: border }]} />}
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
  overviewRow: {
    flexDirection: 'row',
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  overviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  overviewLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  overviewDivider: {
    height: 1,
    marginHorizontal: 14,
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
});
