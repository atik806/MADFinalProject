import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionCard } from '@/features/officials/shared/components/action-card';
import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { StatCard } from '@/features/officials/shared/components/stat-card';
import { StatusBadge } from '@/features/officials/shared/components/status-badge';
import { borderRadius, contentMaxWidth, shadows } from '@/features/officials/shared/constants/layout';
import { useColors } from '@/features/officials/shared/constants/theme';

type Farmer = {
  id: string;
  name: string;
  location: string;
  crop: string;
  status: 'verified' | 'pending' | 'rejected';
};

const MOCK_FARMERS: Farmer[] = [
  { id: 'FAR-001', name: 'Abdul Karim', location: 'Char Fasson', crop: 'Boro Rice', status: 'verified' },
  { id: 'FAR-002', name: 'Rafiqul Islam', location: 'Osmanganj', crop: 'Vegetables', status: 'pending' },
  { id: 'FAR-003', name: 'Jahangir Alam', location: 'Khaser Hat', crop: 'Shrimp', status: 'verified' },
  { id: 'FAR-004', name: 'Shahinur Begum', location: 'Dular Hat', crop: 'Jute', status: 'pending' },
  { id: 'FAR-005', name: 'Mizanur Rahman', location: 'Char Kukri', crop: 'Maize', status: 'rejected' },
];

const QUICK_ACTIONS = [
  { icon: 'person-add-outline' as const, iconBg: '#3A9BD5', title: 'New Farmer\nOnboarding' },
  { icon: 'location-outline' as const, iconBg: '#1A8F5C', title: 'Record Visit' },
  { icon: 'document-text-outline' as const, iconBg: '#7C3AED', title: 'Submit\nApplication' },
  { icon: 'cloud-upload-outline' as const, iconBg: '#F59E0B', title: 'Upload\nDocuments' },
];

const SCHEDULED_TASKS = [
  { time: '09:00 AM', title: 'Field Visit - Abdul Karim', location: 'Char Fasson', type: 'Visit' },
  { time: '11:30 AM', title: 'Document Verification', location: 'Office', type: 'Paperwork' },
  { time: '02:00 PM', title: 'Follow-up - Rafiqul Islam', location: 'Osmanganj', type: 'Visit' },
  { time: '04:00 PM', title: 'Report Submission', location: 'Office', type: 'Report' },
];

export default function FieldOfficerDashboardScreen() {
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
            <ActionCard key={i} icon={action.icon} iconBg={action.iconBg} title={action.title} onPress={() => {}} />
          ))}
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
              <Pressable key={farmer.id} onPress={() => {}} style={({ pressed }) => pressed && styles.pressed}>
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
});
