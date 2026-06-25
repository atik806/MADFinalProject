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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { applications } = useLoans();
  const { t } = useTranslation();
  const app = applications.find((a) => a.id === id);

  if (!app) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <View style={styles.headerLogo}>
              <Ionicons name="leaf" size={18} color="#fff" />
            </View>
          </View>
          <Text style={styles.headerTitle}>{t('loanStatus')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.empty}>
          <Feather name="alert-circle" size={40} color="#D1D5DB" />
          <Text style={styles.emptyText}>{t('applicationNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sc = statusColors[app.status] || statusColors.pending;
  const currentIndex = app.timeline.findIndex((t) => t.status === 'current');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerLogo}>
            <Ionicons name="leaf" size={18} color="#fff" />
          </View>
        </View>
        <Text style={styles.headerTitle}>{t('loanStatus')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.statusCard}>
          <View style={styles.statusTop}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.statusTitle}>{app.title}</Text>
              <Text style={styles.statusRef}>{app.id} · {t('submitted')} {app.date}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.statusBadgeText, { color: sc.color }]}>
                {labelMap[app.status]}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <DetailBox label={t('amount')} value={`৳${app.amount.toLocaleString('en-BD')}`} />
          <View style={styles.detailDivider} />
          <DetailBox label={t('duration')} value={app.duration} />
          <View style={styles.detailDivider} />
          <DetailBox label="EMI" value={`৳${app.emi.toLocaleString('en-BD')}/mo`} />
        </View>

        <Text style={styles.sectionTitle}>{t('applicationTimeline')}</Text>
        <View style={styles.timelineCard}>
          {app.timeline.map((entry, index) => (
            <TimelineStep
              key={entry.label}
              entry={entry}
              isLast={index === app.timeline.length - 1}
              isCurrent={index === currentIndex}
              t={t}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('assignedBankOfficer')}</Text>
        <View style={styles.officerCard}>
          <View style={styles.officerAvatar}>
            <Feather name="user" size={22} color="#006847" />
          </View>
          <View style={styles.officerInfo}>
            <Text style={styles.officerName}>{app.bankOfficer.name}</Text>
            <Text style={styles.officerDetail}>{app.bankOfficer.bank}</Text>
            <Text style={styles.officerDetail}>{app.bankOfficer.branch}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailBox}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function TimelineStep({ entry, isLast, isCurrent, t }: { entry: TimelineEntry; isLast: boolean; isCurrent: boolean; t: (key: any) => string }) {
  const isFailed = entry.status === 'failed';
  const isDone = entry.status === 'done';

  let circleBg = '#E5E7EB';
  let circleIcon: React.ReactNode = <View style={styles.timelineDot} />;
  if (isDone) {
    circleBg = '#16A34A';
    circleIcon = <Ionicons name="checkmark" size={12} color="#fff" />;
  } else if (isCurrent) {
    circleBg = '#006847';
    circleIcon = <View style={styles.timelineCurrentDot} />;
  } else if (isFailed) {
    circleBg = '#DC2626';
    circleIcon = <Ionicons name="close" size={12} color="#fff" />;
  }

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineCircle, { backgroundColor: circleBg }]}>
          {circleIcon}
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={[styles.timelineContent, isCurrent && styles.timelineContentCurrent]}>
        <View style={styles.timelineTop}>
          <Text style={[styles.timelineLabel, (isDone || isCurrent) && styles.timelineLabelDone, isFailed && styles.timelineLabelFailed]}>
            {entry.label}
          </Text>
          {entry.date ? (
            <Text style={styles.timelineDate}>{entry.date}</Text>
          ) : null}
        </View>
        {isCurrent && (
          <Text style={styles.timelineNote}>⏳ {t('inProgress')} — {t('estimatedDays')}</Text>
        )}
        {isFailed && (
          <Text style={styles.timelineNoteFail}>{t('notApproved')}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#006847',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 30,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  statusTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  statusRef: {
    fontSize: 12,
    color: '#9CA3AF',
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginTop: 12,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  detailBox: {
    flex: 1,
    alignItems: 'center',
  },
  detailDivider: {
    width: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: -18,
  },
  detailLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 12,
  },
  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
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
    backgroundColor: '#9CA3AF',
  },
  timelineCurrentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    minHeight: 36,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 24,
  },
  timelineContentCurrent: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    marginLeft: 12,
  },
  timelineTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    flex: 1,
  },
  timelineLabelDone: {
    color: '#1F2937',
    fontWeight: '600',
  },
  timelineLabelFailed: {
    color: '#DC2626',
    fontWeight: '600',
  },
  timelineDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginLeft: 8,
  },
  timelineNote: {
    fontSize: 12,
    color: '#006847',
    fontWeight: '600',
    marginTop: 6,
  },
  timelineNoteFail: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    marginTop: 4,
  },
  officerCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  officerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
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
    color: '#1F2937',
  },
  officerDetail: {
    fontSize: 13,
    color: '#6B7280',
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
    color: '#9CA3AF',
  },
});
