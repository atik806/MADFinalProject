import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { StatusBadge, type StatusType } from '@/features/officials/shared/components/status-badge';
import { borderRadius, contentMaxWidth, shadows } from '@/features/officials/shared/constants/layout';
import { useColors } from '@/features/officials/shared/constants/theme';
import { api } from '@/lib/api';
import type { ApiResponse, BankOfficerQueueRow, ListResult } from '@/lib/api-types';

// The bank's approval workbench, wired to the live review API:
//   GET  /api/bank-officer/loans            the shared forwarded queue
//   POST /api/bank-officer/loans/:id/review   pull an application into review
//   POST /api/bank-officer/loans/:id/decision approve / reject (notes-driven)
// Every server rule is mirrored in the form so the farmer never gets a
// half-baked decision: rejection needs a reason, approval needs an amount
// > 0 and no higher than the request.

const BANK_STATUSES = new Set(['pending', 'under_review', 'approved', 'rejected', 'active']);

const STATUS_AS_BADGE = (status?: string): StatusType =>
  BANK_STATUSES.has(status ?? '') ? (status as StatusType) : 'pending';

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const d = new Date(String(value));
  if (!Number.isFinite(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const toAmount = (value: string, fallback: number): number => {
  const n = Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

type DecideMode = 'approve' | 'reject' | null;

export default function ApprovalsScreen() {
  const colors = useColors();
  const [items, setItems] = useState<BankOfficerQueueRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [mode, setMode] = useState<DecideMode>(null);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<ListResult<BankOfficerQueueRow>>>('/api/bank-officer/loans?pageSize=100');
      setItems(res?.data?.items ?? []);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message ?? 'Could not load the approval queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadQueue(), 0);
    return () => clearTimeout(timer);
  }, [loadQueue]);

  const pendingApps = items.filter((a) => a.status === 'pending' || a.status === 'under_review');
  const historyApps = items.filter((a) => a.status === 'approved' || a.status === 'rejected');

  const openDecision = (item: BankOfficerQueueRow, nextMode: DecideMode) => {
    setDecisionId(item.id);
    setMode(nextMode);
    setApprovedAmount(String(item.approved_amount ?? item.recommended_amount ?? item.amount ?? ''));
    setNotes(item.decision_notes ?? '');
  };

  const closeDecision = () => {
    setDecisionId(null);
    setMode(null);
    setApprovedAmount('');
    setNotes('');
  };

  const startReview = async (item: BankOfficerQueueRow) => {
    if (busyId) return;
    setBusyId(item.id);
    try {
      await api.post<ApiResponse<BankOfficerQueueRow>>(`/api/bank-officer/loans/${item.id}/review`);
      await loadQueue();
    } catch (err: any) {
      Alert.alert('Start Review', err?.message ?? 'Could not move the application to review.');
    } finally {
      setBusyId(null);
    }
  };

  const submitDecision = async (item: BankOfficerQueueRow) => {
    if (busyId) return;
    const isReject = mode === 'reject';

    if (isReject) {
      if (!notes.trim()) {
        Alert.alert('Reason Required', 'Please provide a reason for rejection.');
        return;
      }
    } else {
      const requested = Number(item.amount ?? 0);
      const amount = toAmount(approvedAmount, 0);
      if (amount <= 0) {
        Alert.alert('Invalid Amount', 'Please enter an approval amount greater than 0.');
        return;
      }
      if (requested > 0 && amount > requested) {
        Alert.alert('Invalid Amount', `The approved amount cannot exceed the requested ৳${requested.toLocaleString()}.`);
        return;
      }
    }

    Alert.alert(
      isReject ? 'Reject Application' : 'Approve Application',
      isReject
        ? 'The farmer will be notified. Are you sure you want to reject this application?'
        : `The farmer will be notified. Approve for ৳${toAmount(approvedAmount, Number(item.amount ?? 0)).toLocaleString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isReject ? 'Reject' : 'Approve',
          style: isReject ? 'destructive' : 'default',
          onPress: async () => {
            setBusyId(item.id);
            try {
              await api.post<ApiResponse<BankOfficerQueueRow>>(`/api/bank-officer/loans/${item.id}/decision`, {
                status: isReject ? 'rejected' : 'approved',
                ...(isReject ? { notes: notes.trim() } : { approvedAmount: toAmount(approvedAmount, Number(item.amount ?? 0)), notes: notes.trim() || undefined }),
              });
              closeDecision();
              await loadQueue();
            } catch (err: any) {
              Alert.alert('Decision', err?.message ?? 'Could not record the decision.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const renderCard = (item: BankOfficerQueueRow, showActions: boolean) => {
    const expanded = expandedId === item.id;
    const farmerName = item.farmer?.name_en ?? item.farmer?.name_bn ?? 'Farmer';
    const canStartReview = item.status === 'pending' && item.verification_status === 'verified';
    const canDecide = (item.status === 'pending' || item.status === 'under_review') && item.verification_status === 'verified';
    const acting = busyId === item.id && expanded;

    return (
      <View key={item.id} style={[styles.card, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
        <Pressable onPress={() => { setExpandedId(expanded ? null : item.id); setDecisionId(null); setMode(null); }} style={({ pressed }) => pressed && styles.pressed}>
          <View style={styles.cardHeader}>
            <View style={styles.cardInfo}>
              <Text style={[styles.appTitle, { color: colors.dashboard.textPrimary }]}>{farmerName}</Text>
              <Text style={[styles.appMeta, { color: colors.dashboard.textSecondary }]}>
                ৳{(item.amount ?? 0).toLocaleString()} • {item.title}
              </Text>
            </View>
            <StatusBadge status={STATUS_AS_BADGE(item.status)} />
          </View>

          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="document-text-outline" size={14} color={colors.dashboard.textSecondary} />
              <Text style={[styles.metaText, { color: colors.dashboard.textPrimary }]}>{item.id.slice(0, 8)}…</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.dashboard.textSecondary} />
              <Text style={[styles.metaText, { color: colors.dashboard.textPrimary }]}>{item.duration ?? '—'}</Text>
            </View>
          </View>

          <View style={[styles.scoreIndicator, { backgroundColor: colors.greenLight + '15' }]}>
            <Text style={[styles.scoreLabel, { color: colors.dashboard.textSecondary }]}>Farmer Credit Score</Text>
            <Text style={[styles.scoreValue, { color: colors.greenLight }]}>
              {item.farmer?.credit_score != null ? String(item.farmer.credit_score) : '—'}
            </Text>
          </View>

          {expanded && (
            <View style={[styles.expandedArea, { borderTopColor: colors.dashboard.border }]}>
              <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary }]}>Financial Summary</Text>
              <View style={styles.finRow}>
                <Text style={[styles.finKey, { color: colors.dashboard.textSecondary }]}>Requested Amount</Text>
                <Text style={[styles.finVal, { color: colors.dashboard.textPrimary }]}>৳{(item.amount ?? 0).toLocaleString()}</Text>
              </View>
              <View style={styles.finRow}>
                <Text style={[styles.finKey, { color: colors.dashboard.textSecondary }]}>Officer Recommendation</Text>
                <Text style={[styles.finVal, { color: colors.dashboard.textPrimary }]}>৳{(item.recommended_amount ?? item.amount ?? 0).toLocaleString()}</Text>
              </View>
              <View style={styles.finRow}>
                <Text style={[styles.finKey, { color: colors.dashboard.textSecondary }]}>Forwarded</Text>
                <Text style={[styles.finVal, { color: colors.dashboard.textPrimary }]}>{formatDate(item.forwarded_at)}</Text>
              </View>
              {item.decision_at ? (
                <View style={styles.finRow}>
                  <Text style={[styles.finKey, { color: colors.dashboard.textSecondary }]}>Decided</Text>
                  <Text style={[styles.finVal, { color: colors.dashboard.textPrimary }]}>{formatDate(item.decision_at)}</Text>
                </View>
              ) : null}
              {item.approved_amount != null && item.status === 'approved' ? (
                <View style={styles.finRow}>
                  <Text style={[styles.finKey, { color: colors.dashboard.textSecondary }]}>Approved Amount</Text>
                  <Text style={[styles.finVal, { color: colors.greenLight }]}>৳{Number(item.approved_amount).toLocaleString()}</Text>
                </View>
              ) : null}
              {item.decision_notes ? (
                <View style={styles.finRow}>
                  <Text style={[styles.finKey, { color: colors.dashboard.textSecondary }]}>Notes</Text>
                  <Text style={[styles.finVal, { color: colors.dashboard.textPrimary, flex: 1, textAlign: 'right' }]}>{item.decision_notes}</Text>
                </View>
              ) : null}
              <View style={styles.finRow}>
                <Text style={[styles.finKey, { color: colors.dashboard.textSecondary }]}>Field Officer</Text>
                <Text style={[styles.finVal, { color: colors.dashboard.textPrimary }]}>
                  {item.field_officer?.name_en ?? item.field_officer?.name_bn ?? '—'}
                </Text>
              </View>

              {showActions && canStartReview && (
                <Pressable
                  onPress={() => startReview(item)}
                  disabled={busyId === item.id}
                  style={[styles.startReviewBtn, { backgroundColor: colors.blueLight }, busyId === item.id && { opacity: 0.6 }]}>
                  <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.startReviewBtnText}>{acting ? 'Moving to Review…' : 'Start Review'}</Text>
                </Pressable>
              )}

              {showActions && canDecide && (
                <View style={styles.actionSection}>
                  {decisionId === item.id ? (
                    <View>
                      <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary }]}>
                        {mode === 'reject' ? 'Reason for Rejection' : 'Approval Amount (defaults to recommendation)'}
                      </Text>
                      {mode === 'approve' && (
                        <TextInput
                          style={[styles.commentInput, { backgroundColor: colors.dashboard.bg, borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary }]}
                          placeholder="Approved amount (৳)"
                          placeholderTextColor={colors.dashboard.textSecondary}
                          keyboardType="numeric"
                          value={approvedAmount}
                          onChangeText={setApprovedAmount}
                        />
                      )}
                      <TextInput
                        style={[styles.commentInput, { backgroundColor: colors.dashboard.bg, borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary }]}
                        placeholder={mode === 'reject' ? 'Reason (required)' : 'Notes (optional)'}
                        placeholderTextColor={colors.dashboard.textSecondary}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={3}
                      />
                      <View style={styles.actionBtns}>
                        <View style={[styles.modeToggle, { borderColor: colors.dashboard.border }]}>
                          {(['approve', 'reject'] as const).map((m) => (
                            <Pressable
                              key={m}
                              onPress={() => setMode(m)}
                              style={[styles.modeBtn, mode === m && { backgroundColor: m === 'approve' ? colors.greenLight + '20' : colors.dashboard.redDown + '20' }]}>
                              <Text style={[styles.modeBtnText, { color: m === 'approve' ? colors.greenLight : colors.dashboard.redDown }, mode === m && { fontWeight: '700' }]}>
                                {m === 'approve' ? 'Approve' : 'Reject'}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        <Pressable
                          onPress={() => submitDecision(item)}
                          disabled={busyId === item.id}
                          style={[styles.actionBtn, { backgroundColor: mode === 'reject' ? colors.dashboard.redDown : colors.greenLight }, busyId === item.id && { opacity: 0.6 }]}>
                          <Ionicons name={mode === 'reject' ? 'close-circle' : 'checkmark-circle'} size={18} color="#FFFFFF" />
                          <Text style={styles.actionBtnText}>{busyId === item.id ? 'Saving…' : mode === 'reject' ? 'Submit Rejection' : 'Submit Approval'}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.reviewRow}>
                      <Pressable
                        onPress={() => openDecision(item, 'approve')}
                        style={[styles.reviewBtn, { borderColor: colors.greenLight }]}>
                        <Ionicons name="checkmark-circle-outline" size={16} color={colors.greenLight} />
                        <Text style={[styles.reviewBtnText, { color: colors.greenLight }]}>Approve</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => openDecision(item, 'reject')}
                        style={[styles.reviewBtn, { borderColor: colors.dashboard.redDown }]}>
                        <Ionicons name="close-circle-outline" size={16} color={colors.dashboard.redDown} />
                        <Text style={[styles.reviewBtnText, { color: colors.dashboard.redDown }]}>Reject</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          <View style={styles.expandHint}>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.dashboard.textSecondary} />
          </View>
        </Pressable>
      </View>
    );
  };

  const bg = colors.dashboard.bg;
  const textPrimary = colors.dashboard.textPrimary;
  const textSecondary = colors.dashboard.textSecondary;

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <ScreenHeader title="Approvals" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {loading && !loadError ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
            <Text style={[styles.emptySubtitle, { color: textSecondary }]}>Loading applications…</Text>
          </View>
        ) : loadError ? (
          <View style={[styles.card, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.redDown }]}>
            <View style={styles.emptyInner}>
              <Ionicons name="cloud-offline-outline" size={48} color={colors.dashboard.redDown} />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>Could not load approvals</Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>{loadError}</Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: textSecondary }]}>
              Pending Review ({pendingApps.length})
            </Text>
            {pendingApps.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
                <Ionicons name="checkmark-done-outline" size={48} color={textSecondary} />
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>All caught up!</Text>
                <Text style={[styles.emptySubtitle, { color: textSecondary }]}>No pending applications to review</Text>
              </View>
            ) : (
              pendingApps.map((app) => renderCard(app, true))
            )}

            <Text style={[styles.sectionTitle, { color: textSecondary, marginTop: 20 }]}>
              Approval History ({historyApps.length})
            </Text>
            {historyApps.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
                <Ionicons name="time-outline" size={48} color={textSecondary} />
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>No history yet</Text>
                <Text style={[styles.emptySubtitle, { color: textSecondary }]}>Reviewed applications will appear here</Text>
              </View>
            ) : (
              historyApps.map((app) => renderCard(app, false))
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
  scroll: { flex: 1 },
  content: { padding: 16, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  card: { borderRadius: borderRadius.md, borderWidth: 1, ...shadows.cardSubtle, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14, paddingBottom: 6 },
  cardInfo: { flex: 1, marginRight: 8 },
  appTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  appMeta: { fontSize: 12 },
  cardMeta: { flexDirection: 'row', gap: 16, paddingHorizontal: 14, paddingBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontWeight: '500' },
  scoreIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: borderRadius.sm },
  scoreLabel: { fontSize: 12, fontWeight: '500' },
  scoreValue: { fontSize: 16, fontWeight: '800' },
  expandedArea: { borderTopWidth: 1, padding: 14, paddingTop: 12 },
  expandedLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 16 },
  finKey: { fontSize: 13 },
  finVal: { fontSize: 13, fontWeight: '600' },
  actionSection: { marginTop: 14 },
  startReviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: borderRadius.sm, marginTop: 12 },
  startReviewBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  reviewRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  reviewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: borderRadius.sm, borderWidth: 1.5 },
  reviewBtnText: { fontSize: 14, fontWeight: '700' },
  commentInput: { borderWidth: 1, borderRadius: borderRadius.sm, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 10 },
  modeToggle: { flexDirection: 'row', padding: 3, borderRadius: borderRadius.sm, borderWidth: 1, marginBottom: 10 },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: borderRadius.sm, alignItems: 'center' },
  modeBtnText: { fontSize: 13, fontWeight: '600' },
  actionBtns: { flexDirection: 'column', gap: 0, marginTop: 0 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: borderRadius.sm, marginTop: 10 },
  actionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  expandHint: { alignItems: 'center', paddingBottom: 6 },
  emptyCard: { borderRadius: borderRadius.md, borderWidth: 1, alignItems: 'center', padding: 40, gap: 8 },
  emptyInner: { alignItems: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});