import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { StatusBadge } from '@/features/officials/shared/components/status-badge';
import { borderRadius, contentMaxWidth, shadows } from '@/features/officials/shared/constants/layout';
import { useColors } from '@/features/officials/shared/constants/theme';
import { farmerName, num, useBankReview } from '@/features/officials/bank-officer/hooks/useBankReview';
import type { BankReviewRow } from '@/lib/api-types';

export default function ApprovalsScreen() {
  const colors = useColors();
  const { rows, loading, refreshing, error, actingId, refresh, startReview, decide } = useBankReview();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formId, setFormId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');

  const queue = rows.filter(r => r.status === 'pending' || r.status === 'under_review');
  const history = rows.filter(r => r.status === 'approved' || r.status === 'rejected');

  const openForm = (row: BankReviewRow) => {
    setFormId(row.id);
    setNotes('');
    setAmount(String(num(row.recommended_amount ?? row.amount) || ''));
  };

  const submit = async (row: BankReviewRow, decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && !notes.trim()) {
      Alert.alert('Reason required', 'Add a note explaining the rejection — the farmer sees it.');
      return;
    }
    const approvedAmount = decision === 'approved' ? num(amount) : undefined;
    if (decision === 'approved') {
      if (!approvedAmount || approvedAmount <= 0) {
        Alert.alert('Amount required', 'Enter the sanctioned amount.');
        return;
      }
      if (approvedAmount > num(row.amount)) {
        Alert.alert('Amount too high', `Cannot sanction more than the requested ৳${num(row.amount).toLocaleString()}.`);
        return;
      }
    }
    Alert.alert(
      decision === 'approved' ? 'Approve loan' : 'Reject loan',
      decision === 'approved'
        ? `Sanction ৳${approvedAmount?.toLocaleString()} for ${farmerName(row)}?`
        : `Reject ${farmerName(row)}'s application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: decision === 'rejected' ? 'destructive' : 'default',
          onPress: async () => {
            const res = await decide(row.id, {
              status: decision,
              ...(notes.trim() ? { notes: notes.trim() } : {}),
              ...(approvedAmount !== undefined ? { approvedAmount } : {}),
            });
            if (res.ok) {
              setFormId(null);
              Alert.alert('Done', `Application ${decision}.`);
            } else {
              Alert.alert('Failed', res.message);
            }
          },
        },
      ],
    );
  };

  const onStartReview = async (row: BankReviewRow) => {
    const res = await startReview(row.id);
    if (!res.ok) Alert.alert('Failed', res.message);
  };

  const renderCard = (row: BankReviewRow, actionable: boolean) => {
    const expanded = expandedId === row.id;
    const busy = actingId === row.id;
    const canDecide = row.status === 'under_review';
    return (
      <View key={row.id} style={[styles.card, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
        <Pressable onPress={() => setExpandedId(expanded ? null : row.id)} style={({ pressed }) => pressed && styles.pressed}>
          <View style={styles.cardHeader}>
            <View style={styles.cardInfo}>
              <Text style={[styles.appTitle, { color: colors.dashboard.textPrimary }]}>{row.title ?? 'Loan application'}</Text>
              <Text style={[styles.appMeta, { color: colors.dashboard.textSecondary }]}>
                {farmerName(row)} • ৳{num(row.amount).toLocaleString()}
              </Text>
            </View>
            <StatusBadge status={row.status === 'under_review' ? 'pending' : (row.status as any) ?? 'pending'} />
          </View>

          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.dashboard.textSecondary} />
              <Text style={[styles.metaText, { color: colors.dashboard.textPrimary }]}>
                Field: {row.verification_status ?? 'pending'}
              </Text>
            </View>
            {row.duration ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={colors.dashboard.textSecondary} />
                <Text style={[styles.metaText, { color: colors.dashboard.textPrimary }]}>{row.duration}</Text>
              </View>
            ) : null}
          </View>

          {typeof row.farmer?.credit_score === 'number' && (
            <View style={[styles.scoreIndicator, { backgroundColor: colors.greenLight + '15' }]}>
              <Text style={[styles.scoreLabel, { color: colors.dashboard.textSecondary }]}>Credit Score</Text>
              <Text style={[styles.scoreValue, { color: colors.greenLight }]}>{row.farmer.credit_score}</Text>
            </View>
          )}

          {expanded && (
            <View style={[styles.expandedArea, { borderTopColor: colors.dashboard.border }]}>
              {row.purpose ? (
                <>
                  <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary }]}>Purpose</Text>
                  <Text style={[styles.expandedValue, { color: colors.dashboard.textPrimary }]}>{row.purpose}</Text>
                </>
              ) : null}

              <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary, marginTop: 12 }]}>Financials</Text>
              <View style={styles.finRow}>
                <Text style={[styles.finKey, { color: colors.dashboard.textSecondary }]}>Requested</Text>
                <Text style={[styles.finVal, { color: colors.dashboard.textPrimary }]}>৳{num(row.amount).toLocaleString()}</Text>
              </View>
              {row.recommended_amount != null && (
                <View style={styles.finRow}>
                  <Text style={[styles.finKey, { color: colors.dashboard.textSecondary }]}>Officer recommended</Text>
                  <Text style={[styles.finVal, { color: colors.dashboard.textPrimary }]}>৳{num(row.recommended_amount).toLocaleString()}</Text>
                </View>
              )}
              {row.approved_amount != null && (
                <View style={styles.finRow}>
                  <Text style={[styles.finKey, { color: colors.dashboard.textSecondary }]}>Sanctioned</Text>
                  <Text style={[styles.finVal, { color: colors.greenLight }]}>৳{num(row.approved_amount).toLocaleString()}</Text>
                </View>
              )}

              {row.field_officer ? (
                <>
                  <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary, marginTop: 12 }]}>Verified by</Text>
                  <Text style={[styles.expandedValue, { color: colors.dashboard.textPrimary }]}>
                    {row.field_officer.name_en ?? row.field_officer.name_bn ?? 'Field officer'}
                  </Text>
                </>
              ) : null}
              {row.verification_notes ? (
                <>
                  <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary, marginTop: 12 }]}>Field notes</Text>
                  <Text style={[styles.expandedValue, { color: colors.dashboard.textPrimary }]}>{row.verification_notes}</Text>
                </>
              ) : null}
              {row.decision_notes ? (
                <>
                  <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary, marginTop: 12 }]}>Decision notes</Text>
                  <Text style={[styles.expandedValue, { color: colors.dashboard.textPrimary }]}>{row.decision_notes}</Text>
                </>
              ) : null}

              {actionable && (
                <View style={styles.actionSection}>
                  {!canDecide ? (
                    <Pressable
                      disabled={busy}
                      onPress={() => onStartReview(row)}
                      style={[styles.reviewBtn, { borderColor: colors.greenLight, opacity: busy ? 0.6 : 1 }]}>
                      {busy ? (
                        <ActivityIndicator size="small" color={colors.greenLight} />
                      ) : (
                        <>
                          <Ionicons name="play-circle-outline" size={16} color={colors.greenLight} />
                          <Text style={[styles.reviewBtnText, { color: colors.greenLight }]}>Start Review</Text>
                        </>
                      )}
                    </Pressable>
                  ) : formId === row.id ? (
                    <View>
                      <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary }]}>Sanctioned amount (approve)</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.dashboard.bg, borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary }]}
                        placeholder="Amount in ৳"
                        placeholderTextColor={colors.dashboard.textSecondary}
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                      />
                      <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary, marginTop: 10 }]}>Notes (required to reject)</Text>
                      <TextInput
                        style={[styles.input, styles.multiline, { backgroundColor: colors.dashboard.bg, borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary }]}
                        placeholder="Reason / conditions..."
                        placeholderTextColor={colors.dashboard.textSecondary}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={3}
                      />
                      <View style={styles.actionBtns}>
                        <Pressable
                          disabled={busy}
                          onPress={() => submit(row, 'approved')}
                          style={[styles.actionBtn, { backgroundColor: colors.greenLight, opacity: busy ? 0.6 : 1 }]}>
                          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                          <Text style={styles.actionBtnText}>Approve</Text>
                        </Pressable>
                        <Pressable
                          disabled={busy}
                          onPress={() => submit(row, 'rejected')}
                          style={[styles.actionBtn, { backgroundColor: colors.dashboard.redDown, opacity: busy ? 0.6 : 1 }]}>
                          <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                          <Text style={styles.actionBtnText}>Reject</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => openForm(row)}
                      style={[styles.reviewBtn, { borderColor: colors.greenLight }]}>
                      <Ionicons name="create-outline" size={16} color={colors.greenLight} />
                      <Text style={[styles.reviewBtnText, { color: colors.greenLight }]}>Record Decision</Text>
                    </Pressable>
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

  return (
    <View style={[styles.screen, { backgroundColor: colors.dashboard.bg }]}>
      <ScreenHeader title="Approvals" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.greenLight} />}
      >
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.dashboard.redDown + '18', borderColor: colors.dashboard.redDown }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.dashboard.redDown} />
            <Text style={[styles.errorText, { color: colors.dashboard.redDown }]}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={colors.greenLight} /></View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.dashboard.textSecondary }]}>
              Pending Review ({queue.length})
            </Text>
            {queue.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
                <Ionicons name="checkmark-done-outline" size={48} color={colors.dashboard.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.dashboard.textPrimary }]}>All caught up!</Text>
                <Text style={[styles.emptySubtitle, { color: colors.dashboard.textSecondary }]}>No forwarded applications waiting.</Text>
              </View>
            ) : (
              queue.map(row => renderCard(row, true))
            )}

            <Text style={[styles.sectionTitle, { color: colors.dashboard.textSecondary, marginTop: 20 }]}>
              Decision History ({history.length})
            </Text>
            {history.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
                <Ionicons name="time-outline" size={48} color={colors.dashboard.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.dashboard.textPrimary }]}>No history yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.dashboard.textSecondary }]}>Decided applications appear here.</Text>
              </View>
            ) : (
              history.map(row => renderCard(row, false))
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
  loadingBox: { padding: 40, alignItems: 'center' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: borderRadius.sm, borderWidth: 1, marginBottom: 12 },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },
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
  expandedLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  expandedValue: { fontSize: 14, fontWeight: '500' },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  finKey: { fontSize: 13 },
  finVal: { fontSize: 13, fontWeight: '600' },
  actionSection: { marginTop: 14 },
  input: { borderWidth: 1, borderRadius: borderRadius.sm, padding: 12, fontSize: 14 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  actionBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: borderRadius.sm },
  actionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: borderRadius.sm, borderWidth: 1.5 },
  reviewBtnText: { fontSize: 14, fontWeight: '700' },
  expandHint: { alignItems: 'center', paddingBottom: 6 },
  emptyCard: { borderRadius: borderRadius.md, borderWidth: 1, alignItems: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
