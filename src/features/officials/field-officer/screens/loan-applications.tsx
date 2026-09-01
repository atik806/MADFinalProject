import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { borderRadius, contentMaxWidth, shadows } from '@/features/officials/shared/constants/layout';
import { useColors } from '@/features/officials/shared/constants/theme';
import { api } from '@/lib/api';

type Tab = 'all' | 'pending' | 'verified' | 'forwarded';

// The officer-side application card: the farmer summary is embedded by the
// officer loans endpoint (never a client-supplied name).
type LoanApplication = {
  id: string;
  title: string;
  date: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  amount: number;
  duration: string;
  purpose: string;
  installmentType: 'monthly' | 'seasonal';
  emi: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  timeline: { label: string; date: string; status: 'done' | 'current' | 'pending' | 'failed' }[];
  farmerName: string;
  forwarded: boolean;
};

const formatDate = (value: string): string => {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, ' ');
};

const mapOfficerLoanRow = (row: any): LoanApplication => {
  const status = String(row.status ?? 'pending') as LoanApplication['status'];
  const verificationStatus = String(row.verification_status ?? 'pending') as LoanApplication['verificationStatus'];
  const submittedAt = formatDate(String(row?.application_date ?? row?.created_at ?? ''));

  // Officer-relevant pipeline steps, derived from the row's own stamps.
  const timeline = [
    { label: 'Application Submitted', date: submittedAt, status: 'done' as const },
    { label: 'Field Officer Verified', date: row.verified_at ? formatDate(String(row.verified_at)) : '', status: verificationStatus === 'verified' ? ('done' as const) : verificationStatus === 'rejected' ? ('failed' as const) : ('pending' as const) },
    { label: 'Forwarded to Bank', date: row.forwarded_at ? formatDate(String(row.forwarded_at)) : '', status: row.forwarded_at ? ('done' as const) : ('pending' as const) },
    { label: 'Bank Decision', date: row.decision_at ? formatDate(String(row.decision_at)) : '', status: status === 'approved' ? ('done' as const) : status === 'rejected' ? ('failed' as const) : ('pending' as const) },
  ];

  return {
    id: String(row.id),
    title: row.title ?? '',
    date: submittedAt,
    status,
    amount: Number(row.amount ?? 0),
    duration: row.duration ?? '',
    purpose: row.purpose ?? '',
    installmentType: row.installment_type === 'seasonal' ? 'seasonal' : 'monthly',
    emi: Number(row.emi ?? 0),
    verificationStatus,
    timeline,
    farmerName: row.farmer?.name_en ?? row.farmer?.name_bn ?? 'Unknown Farmer',
    forwarded: Boolean(row.forwarded_at),
  };
};

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending Verification' },
  { key: 'verified', label: 'Verified' },
  { key: 'forwarded', label: 'Forwarded to Bank' },
];

function getLoanStatusInfo(status: LoanApplication['status']) {
  switch (status) {
    case 'pending':
      return { label: 'Pending Verification', bg: '#FEF3C7', color: '#92400E', icon: 'time' as const };
    case 'under_review':
      return { label: 'Verified', bg: '#D1FAE5', color: '#065F46', icon: 'checkmark-circle' as const };
    case 'approved':
      return { label: 'Forwarded to Bank', bg: '#DBEAFE', color: '#1E40AF', icon: 'arrow-forward-circle' as const };
    case 'rejected':
      return { label: 'Rejected', bg: '#FEE2E2', color: '#991B1B', icon: 'close-circle' as const };
  }
}

// Tab semantics with real pipeline data: "Pending Verification" = submitted
// and not yet verified by the officer; "Verified" = verified but not yet
// forwarded; "Forwarded to Bank" = handed to the bank (forwarded_at set).
function filterApplications(apps: LoanApplication[], tab: Tab): LoanApplication[] {
  switch (tab) {
    case 'pending':
      return apps.filter((a) => a.verificationStatus === 'pending');
    case 'verified':
      return apps.filter((a) => a.verificationStatus === 'verified' && !a.forwarded);
    case 'forwarded':
      return apps.filter((a) => a.forwarded);
    default:
      return apps;
  }
}

export default function LoanApplicationsScreen() {
  const colors = useColors();
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Server-side verification state is authoritative after the API wiring;
  // only the write-side dedup guard is still needed locally.
  const [, setVerifiedIds] = useState<Set<string>>(new Set());

  const loadApplications = useCallback(async () => {
    try {
      // The officer's OWN applications list — server-scoped to the officer's
      // active farmer assignments, with a farmer summary per row.
      const res = await api.get<any>('/api/field-officer/loans?pageSize=100');
      setApplications((res?.data?.items ?? []).map(mapOfficerLoanRow));
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message ?? 'Could not load loan applications.');
    }
  }, []);

  useEffect(() => {
    // Data fetch on mount. The kickoff is deferred out of the effect body;
    // state updates happen only after the fetch resolves.
    const timer = setTimeout(() => void loadApplications(), 0);
    return () => clearTimeout(timer);
  }, [loadApplications]);

  const filtered = filterApplications(applications, activeTab);

  const bg = colors.dashboard.bg;
  const cardBg = colors.dashboard.cardBg;
  const textPrimary = colors.dashboard.textPrimary;
  const textSecondary = colors.dashboard.textSecondary;
  const border = colors.dashboard.border;

  const handleVerify = async (id: string) => {
    if (verifyingId) return;
    setVerifyingId(id);
    try {
      // Record the officer verification verdict; the server transitions the
      // application's verification_status and stamps verified_at.
      await api.post<any>(`/api/field-officer/loans/${id}/verify`, {
        status: 'verified',
        notes: 'Verified by field officer from mobile app.',
      });
      setVerifiedIds((prev) => new Set(prev).add(id));
      await loadApplications();
    } catch (err: any) {
      Alert.alert('Verify Application', err?.message ?? 'Could not record the verification.');
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <ScreenHeader title="Loan Applications" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Tabs */}
        <View style={[styles.tabRow, { backgroundColor: cardBg, borderColor: border }]}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tabBtn, active && { backgroundColor: colors.greenLight + '15' }]}>
                <Text style={[styles.tabLabel, { color: active ? colors.greenLight : textSecondary }, active && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* List */}
        {loadError ? (
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
                {activeTab === 'all'
                  ? 'Loan applications will appear here'
                  : `No applications in "${TABS.find((t) => t.key === activeTab)?.label}"`}
              </Text>
            </View>
          </View>
        ) : (
          filtered.map((app) => {
            const expanded = expandedId === app.id;
            const statusInfo = getLoanStatusInfo(app.status);
            const farmerName = app.farmerName;

            return (
              <View key={app.id} style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
                <Pressable
                  onPress={() => setExpandedId(expanded ? null : app.id)}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.farmerName, { color: textPrimary }]}>{farmerName}</Text>
                      <Text style={[styles.loanPurpose, { color: textSecondary }]}>{app.title}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusInfo.bg }]}>
                      <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
                      <Text style={[styles.badgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                    </View>
                  </View>

                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="cash-outline" size={14} color={textSecondary} />
                      <Text style={[styles.metaText, { color: textPrimary }]}>Tk {app.amount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={14} color={textSecondary} />
                      <Text style={[styles.metaText, { color: textPrimary }]}>{app.date}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={14} color={textSecondary} />
                      <Text style={[styles.metaText, { color: textPrimary }]}>{app.duration}</Text>
                    </View>
                  </View>

                    {expanded && (
                    <View style={[styles.expandedArea, { borderTopColor: border }]}>
                      {/* Timeline */}
                      <Text style={[styles.expandedLabel, { color: textSecondary }]}>Timeline</Text>
                      {app.timeline.map((entry, ti) => {
                        let dotColor: string = textSecondary;
                        let lineColor: string = border;
                        if (entry.status === 'done') { dotColor = colors.greenLight; lineColor = colors.greenLight + '40'; }
                        else if (entry.status === 'current') { dotColor = colors.blueLight; lineColor = colors.blueLight + '40'; }
                        else if (entry.status === 'failed') { dotColor = colors.dashboard.redDown; lineColor = colors.dashboard.redDown + '40'; }

                        return (
                          <View key={ti} style={styles.timelineRow}>
                            <View style={styles.timelineDotCol}>
                              <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
                              {ti < app.timeline.length - 1 && (
                                <View style={[styles.timelineLine, { backgroundColor: lineColor }]} />
                              )}
                            </View>
                            <View style={styles.timelineInfo}>
                              <Text style={[styles.timelineLabel, { color: textPrimary }]}>{entry.label}</Text>
                              {entry.date ? (
                                <Text style={[styles.timelineDate, { color: textSecondary }]}>{entry.date}</Text>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}

                      {/* Documents needed */}
                      <Text style={[styles.expandedLabel, { color: textSecondary, marginTop: 12 }]}>Documents Required</Text>
                      <View style={styles.docRow}>
                        <Ionicons name="document-outline" size={16} color={colors.blueLight} />
                        <Text style={[styles.docText, { color: textPrimary }]}>NID Card Copy</Text>
                      </View>
                      <View style={styles.docRow}>
                        <Ionicons name="document-outline" size={16} color={colors.blueLight} />
                        <Text style={[styles.docText, { color: textPrimary }]}>Land Title Deed</Text>
                      </View>
                      <View style={styles.docRow}>
                        <Ionicons name="document-outline" size={16} color={colors.blueLight} />
                        <Text style={[styles.docText, { color: textPrimary }]}>Crop Production Plan</Text>
                      </View>
                      <View style={styles.docRow}>
                        <Ionicons name="document-outline" size={16} color={colors.blueLight} />
                        <Text style={[styles.docText, { color: textPrimary }]}>Bank Account Statement</Text>
                      </View>

                      {/* Verify button: visible while the application awaits
                          this officer's verdict AND is still with the officer
                          (forwarded applications belong to the bank now). */}
                      {app.verificationStatus === 'pending' && !app.forwarded && (
                        <Pressable
                          onPress={() => handleVerify(app.id)}
                          disabled={verifyingId === app.id}
                          style={[styles.verifyBtn, { backgroundColor: colors.greenLight }, verifyingId === app.id && { opacity: 0.6 }]}>
                          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                          <Text style={styles.verifyBtnText}>{verifyingId === app.id ? 'Verifying…' : 'Verify Application'}</Text>
                        </Pressable>
                      )}
                      {(app.verificationStatus === 'verified' || app.verificationStatus === 'rejected' || app.forwarded) && (
                        <View style={[styles.verifyBtn, styles.verifyBtnDisabled, { backgroundColor: colors.greenLight + '20' }]}>
                          <Ionicons name={app.verificationStatus === 'rejected' ? 'close-circle' : 'checkmark-circle'} size={18} color={colors.greenLight} />
                          <Text style={[styles.verifyBtnText, { color: colors.greenLight }]}>
                            {app.verificationStatus === 'rejected' ? 'Rejected' : app.forwarded ? 'Forwarded to Bank' : 'Verified'}
                          </Text>
                        </View>
                      )}
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
  tabRow: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: 3,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    ...shadows.cardSubtle,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    paddingBottom: 8,
  },
  cardInfo: {
    flex: 1,
    marginRight: 8,
  },
  farmerName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  loanPurpose: {
    fontSize: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  expandedArea: {
    borderTopWidth: 1,
    padding: 14,
    paddingTop: 12,
  },
  expandedLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineDotCol: {
    width: 20,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 2,
  },
  timelineInfo: {
    flex: 1,
    paddingBottom: 12,
    paddingLeft: 6,
  },
  timelineLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  timelineDate: {
    fontSize: 11,
    marginTop: 1,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  docText: {
    fontSize: 13,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    marginTop: 12,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  expandHint: {
    alignItems: 'center',
    paddingBottom: 6,
  },
  emptyInner: {
    alignItems: 'center',
    padding: 40,
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
  pressed: {
    opacity: 0.7,
  },
});
