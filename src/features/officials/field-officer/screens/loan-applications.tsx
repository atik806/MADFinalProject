import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { borderRadius, contentMaxWidth, shadows } from '@/features/officials/shared/constants/layout';
import { useColors } from '@/features/officials/shared/constants/theme';
import { useLoans, type LoanApplication } from '@/contexts/LoanContext';
import { LOAN_APP_TABS, FARMER_NAMES } from '@/data';
import { getLoanStatusInfo } from '@/data';

type Tab = 'all' | 'pending' | 'verified' | 'forwarded';

function filterApplications(apps: LoanApplication[], tab: Tab): LoanApplication[] {
  switch (tab) {
    case 'pending':
      return apps.filter((a) => a.status === 'pending');
    case 'verified':
      return apps.filter((a) => a.status === 'under_review');
    case 'forwarded':
      return apps.filter((a) => a.status === 'approved');
    default:
      return apps;
  }
}

export default function LoanApplicationsScreen() {
  const colors = useColors();
  const { applications } = useLoans();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());

  const filtered = filterApplications(applications, activeTab);

  const bg = colors.dashboard.bg;
  const cardBg = colors.dashboard.cardBg;
  const textPrimary = colors.dashboard.textPrimary;
  const textSecondary = colors.dashboard.textSecondary;
  const border = colors.dashboard.border;

  const handleVerify = (id: string) => {
    setVerifiedIds((prev) => new Set(prev).add(id));
  };

  const isVerified = (id: string) => verifiedIds.has(id);

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <ScreenHeader title="Loan Applications" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Tabs */}
        <View style={[styles.tabRow, { backgroundColor: cardBg, borderColor: border }]}>
          {LOAN_APP_TABS.map((tab) => {
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
        {filtered.length === 0 ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.emptyInner}>
              <Ionicons name="document-text-outline" size={48} color={textSecondary} />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>No applications found</Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                {activeTab === 'all'
                  ? 'Loan applications will appear here'
                  : `No applications in "${LOAN_APP_TABS.find((t) => t.key === activeTab)?.label}"`}
              </Text>
            </View>
          </View>
        ) : (
          filtered.map((app) => {
            const expanded = expandedId === app.id;
            const statusInfo = getLoanStatusInfo(app.status);
            const farmerName = FARMER_NAMES[app.id] || 'Unknown Farmer';
            const isLocalVerified = isVerified(app.id);

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

                      {/* Verify button */}
                      {app.status === 'pending' && !isLocalVerified && (
                        <Pressable
                          onPress={() => handleVerify(app.id)}
                          style={[styles.verifyBtn, { backgroundColor: colors.greenLight }]}>
                          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                          <Text style={styles.verifyBtnText}>Verify Application</Text>
                        </Pressable>
                      )}
                      {(app.status !== 'pending' || isLocalVerified) && (
                        <View style={[styles.verifyBtn, styles.verifyBtnDisabled, { backgroundColor: colors.greenLight + '20' }]}>
                          <Ionicons name="checkmark-circle" size={18} color={colors.greenLight} />
                          <Text style={[styles.verifyBtnText, { color: colors.greenLight }]}>Verified</Text>
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
