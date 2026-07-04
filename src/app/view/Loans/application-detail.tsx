import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useLoans, type TimelineEntry } from '../../../contexts/LoanContext';
import { useTranslation } from '../../../hooks/use-translation';
import { useColors } from '../../../features/officials/shared/constants/theme';

const labelMap: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const statusColors: Record<string, { color: string; bg: string }> = {
  pending: { color: '#D97706', bg: '#FFFBEB' },
  under_review: { color: '#2563EB', bg: '#EFF6FF' },
  approved: { color: '#16A34A', bg: '#ECFDF5' },
  rejected: { color: '#DC2626', bg: '#FEF2F2' },
};

export default function ApplicationDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { applications } = useLoans();
  const { t } = useTranslation();
  const app = applications.find((a) => a.id === id);

  if (!app) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.dashboard.bg }]}>
        <View style={[styles.header, { backgroundColor: colors.dashboard.cardBg, borderBottomColor: colors.dashboard.border }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back" size={24} color={colors.dashboard.textPrimary} />
            </TouchableOpacity>
            <View style={[styles.headerLogo, { backgroundColor: colors.deepGreen }]}>
              <Ionicons name="leaf" size={18} color="#fff" />
            </View>
          </View>
          <Text style={[styles.headerTitle, { color: colors.dashboard.textPrimary }]}>{t('loanStatus')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.empty}>
          <Feather name="alert-circle" size={40} color={colors.dashboard.border} />
          <Text style={[styles.emptyText, { color: colors.dashboard.textSecondary }]}>{t('applicationNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sc = statusColors[app.status] || statusColors.pending;
  const currentIndex = app.timeline.findIndex((t) => t.status === 'current');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.dashboard.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.dashboard.cardBg, borderBottomColor: colors.dashboard.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.dashboard.textPrimary} />
          </TouchableOpacity>
          <View style={[styles.headerLogo, { backgroundColor: colors.deepGreen }]}>
            <Ionicons name="leaf" size={18} color="#fff" />
          </View>
        </View>
        <Text style={[styles.headerTitle, { color: colors.dashboard.textPrimary }]}>{t('loanStatus')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.statusCard, { backgroundColor: colors.dashboard.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 }]}>
          <View style={styles.statusTop}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.statusTitle, { color: colors.dashboard.textPrimary }]}>{app.title}</Text>
              <Text style={[styles.statusRef, { color: colors.dashboard.textSecondary }]}>{app.id} · {t('submitted')} {app.date}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.statusBadgeText, { color: sc.color }]}>
                {labelMap[app.status]}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.detailsRow, { backgroundColor: colors.dashboard.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }]}>
          <DetailBox label={t('amount')} value={`৳${app.amount.toLocaleString('en-BD')}`} colors={colors} />
          <View style={[styles.detailDivider, { backgroundColor: colors.dashboard.border }]} />
          <DetailBox label={t('duration')} value={app.duration} colors={colors} />
          <View style={[styles.detailDivider, { backgroundColor: colors.dashboard.border }]} />
          <DetailBox label="EMI" value={`৳${app.emi.toLocaleString('en-BD')}/mo`} colors={colors} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.dashboard.textPrimary }]}>{t('applicationTimeline')}</Text>
        <View style={[styles.timelineCard, { backgroundColor: colors.dashboard.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 }]}>
          {app.timeline.map((entry, index) => (
            <TimelineStep
              key={entry.label}
              entry={entry}
              isLast={index === app.timeline.length - 1}
              isCurrent={index === currentIndex}
              t={t}
              colors={colors}
            />
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.dashboard.textPrimary }]}>{t('assignedBankOfficer')}</Text>
        <View style={[styles.officerCard, { backgroundColor: colors.dashboard.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 }]}>
          <View style={[styles.officerAvatar, { backgroundColor: colors.userVerified }]}>
            <Feather name="user" size={22} color={colors.deepGreen} />
          </View>
          <View style={styles.officerInfo}>
            <Text style={[styles.officerName, { color: colors.dashboard.textPrimary }]}>{app.bankOfficer.name}</Text>
            <Text style={[styles.officerDetail, { color: colors.dashboard.textSecondary }]}>{app.bankOfficer.bank}</Text>
            <Text style={[styles.officerDetail, { color: colors.dashboard.textSecondary }]}>{app.bankOfficer.branch}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailBox({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.detailBox}>
      <Text style={[styles.detailLabel, { color: colors.dashboard.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.dashboard.textPrimary }]}>{value}</Text>
    </View>
  );
}

function TimelineStep({ entry, isLast, isCurrent, t, colors }: { entry: TimelineEntry; isLast: boolean; isCurrent: boolean; t: (key: any) => string; colors: any }) {
  const isFailed = entry.status === 'failed';
  const isDone = entry.status === 'done';

  let circleBg = colors.dashboard.border;
  let circleIcon: React.ReactNode = <View style={[styles.timelineDot, { backgroundColor: colors.dashboard.textSecondary }]} />;
  if (isDone) {
    circleBg = colors.dashboard.greenUp;
    circleIcon = <Ionicons name="checkmark" size={12} color="#fff" />;
  } else if (isCurrent) {
    circleBg = colors.deepGreen;
    circleIcon = <View style={[styles.timelineCurrentDot, { backgroundColor: '#fff' }]} />;
  } else if (isFailed) {
    circleBg = colors.dashboard.redDown;
    circleIcon = <Ionicons name="close" size={12} color="#fff" />;
  }

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineCircle, { backgroundColor: circleBg }]}>
          {circleIcon}
        </View>
        {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.dashboard.border }]} />}
      </View>
      <View style={[styles.timelineContent, isCurrent && { backgroundColor: colors.userVerified, borderRadius: 12, padding: 12, marginBottom: 12, marginLeft: 12 }]}>
        <View style={styles.timelineTop}>
          <Text style={[styles.timelineLabel, { color: colors.dashboard.textSecondary }, (isDone || isCurrent) && { color: colors.dashboard.textPrimary, fontWeight: '600' }, isFailed && { color: colors.dashboard.redDown, fontWeight: '600' }]}>
            {entry.label}
          </Text>
          {entry.date ? (
            <Text style={[styles.timelineDate, { color: colors.dashboard.textSecondary }]}>{entry.date}</Text>
          ) : null}
        </View>
        {isCurrent && (
          <Text style={[styles.timelineNote, { color: colors.deepGreen }]}>⏳ {t('inProgress')} — {t('estimatedDays')}</Text>
        )}
        {isFailed && (
          <Text style={[styles.timelineNoteFail, { color: colors.dashboard.redDown }]}>{t('notApproved')}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 30,
  },
  statusCard: {
    borderRadius: 18,
    padding: 18,
  },
  statusTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  statusRef: {
    fontSize: 12,
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailsRow: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 18,
    marginTop: 12,
  },
  detailBox: {
    flex: 1,
    alignItems: 'center',
  },
  detailDivider: {
    width: 1,
    marginVertical: -18,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
  },
  timelineCard: {
    borderRadius: 18,
    padding: 18,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineLeft: {
    alignItems: 'center',
    width: 28,
  },
  timelineCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineCurrentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 36,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 24,
  },
  timelineTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  timelineDate: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  timelineNote: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  timelineNoteFail: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  officerCard: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  officerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  officerInfo: {
    flex: 1,
  },
  officerName: {
    fontSize: 15,
    fontWeight: '700',
  },
  officerDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
