import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { StatusBadge } from '@/features/officials/shared/components/status-badge';
import { borderRadius, contentMaxWidth, shadows } from '@/features/officials/shared/constants/layout';
import { useColors } from '@/features/officials/shared/constants/theme';
import { useLoans, type LoanApplication } from '@/contexts/LoanContext';

export default function ApprovalsScreen() {
  const colors = useColors();
  const { applications } = useLoans();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentId, setCommentId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [localApps, setLocalApps] = useState<LoanApplication[]>(applications);

  const pendingApps = localApps.filter(a => a.status === 'pending' || a.status === 'under_review');
  const historyApps = localApps.filter(a => a.status === 'approved' || a.status === 'rejected');

  const handleAction = (id: string, newStatus: 'approved' | 'rejected') => {
    if (newStatus === 'rejected' && !comment.trim()) {
      Alert.alert('Comment Required', 'Please provide a reason for rejection.');
      return;
    }
    if (newStatus === 'approved' && !comment.trim()) {
      Alert.alert('Comment Required', 'Please add an approving comment.');
      return;
    }
    Alert.alert(
      newStatus === 'approved' ? 'Approve Loan' : 'Reject Loan',
      `Are you sure you want to ${newStatus === 'approved' ? 'approve' : 'reject'} this application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newStatus === 'rejected' ? 'destructive' : 'default',
          onPress: () => {
            setLocalApps(prev =>
              prev.map(a => (a.id === id ? { ...a, status: newStatus } : a)),
            );
            setCommentId(null);
            setComment('');
            Alert.alert('Success', `Loan ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully.`);
          },
        },
      ],
    );
  };

  const renderAppCard = (app: LoanApplication, showActions: boolean) => {
    const expanded = expandedId === app.id;
    return (
      <View key={app.id} style={[styles.card, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
        <Pressable onPress={() => setExpandedId(expanded ? null : app.id)} style={({ pressed }) => pressed && styles.pressed}>
          <View style={styles.cardHeader}>
            <View style={styles.cardInfo}>
              <Text style={[styles.appTitle, { color: colors.dashboard.textPrimary }]}>{app.title}</Text>
              <Text style={[styles.appMeta, { color: colors.dashboard.textSecondary }]}>
                ৳{app.amount.toLocaleString()} • {app.date}
              </Text>
            </View>
            <StatusBadge status={app.status === 'under_review' ? 'pending' : app.status as any} />
          </View>

          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={14} color={colors.dashboard.textSecondary} />
              <Text style={[styles.metaText, { color: colors.dashboard.textPrimary }]}>{app.id}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.dashboard.textSecondary} />
              <Text style={[styles.metaText, { color: colors.dashboard.textPrimary }]}>{app.duration}</Text>
            </View>
          </View>

          <View style={[styles.scoreIndicator, { backgroundColor: colors.greenLight + '15' }]}>
            <Text style={[styles.scoreLabel, { color: colors.dashboard.textSecondary }]}>Credit Score</Text>
            <Text style={[styles.scoreValue, { color: colors.greenLight }]}>720</Text>
          </View>

          {expanded && (
            <View style={[styles.expandedArea, { borderTopColor: colors.dashboard.border }]}>
              <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary }]}>Purpose</Text>
              <Text style={[styles.expandedValue, { color: colors.dashboard.textPrimary }]}>{app.purpose}</Text>

              <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary, marginTop: 12 }]}>Financial Summary</Text>
              <View style={styles.finRow}>
                <Text style={[styles.finKey, { color: colors.dashboard.textSecondary }]}>Loan Amount</Text>
                <Text style={[styles.finVal, { color: colors.dashboard.textPrimary }]}>৳{app.amount.toLocaleString()}</Text>
              </View>
              <View style={styles.finRow}>
                <Text style={[styles.finKey, { color: colors.dashboard.textSecondary }]}>Duration</Text>
                <Text style={[styles.finVal, { color: colors.dashboard.textPrimary }]}>{app.duration}</Text>
              </View>
              <View style={styles.finRow}>
                <Text style={[styles.finKey, { color: colors.dashboard.textSecondary }]}>EMI</Text>
                <Text style={[styles.finVal, { color: colors.dashboard.textPrimary }]}>৳{app.emi.toLocaleString()}/{app.installmentType}</Text>
              </View>

              <Text style={[styles.expandedLabel, { color: colors.dashboard.textSecondary, marginTop: 12 }]}>Bank Officer</Text>
              <Text style={[styles.expandedValue, { color: colors.dashboard.textPrimary }]}>
                {app.bankOfficer.name} • {app.bankOfficer.bank}, {app.bankOfficer.branch}
              </Text>

              {showActions && (
                <View style={styles.actionSection}>
                  {commentId === app.id ? (
                    <View>
                      <TextInput
                        style={[styles.commentInput, { backgroundColor: colors.dashboard.bg, borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary }]}
                        placeholder="Enter your comment..."
                        placeholderTextColor={colors.dashboard.textSecondary}
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        numberOfLines={3}
                      />
                      <View style={styles.actionBtns}>
                        <Pressable
                          onPress={() => handleAction(app.id, 'approved')}
                          style={[styles.actionBtn, styles.approveBtn, { backgroundColor: colors.greenLight }]}>
                          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                          <Text style={styles.actionBtnText}>Approve</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleAction(app.id, 'rejected')}
                          style={[styles.actionBtn, styles.rejectBtn, { backgroundColor: colors.dashboard.redDown }]}>
                          <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                          <Text style={styles.actionBtnText}>Reject</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => { setCommentId(app.id); setComment(''); }}
                      style={[styles.reviewBtn, { borderColor: colors.greenLight }]}>
                      <Ionicons name="create-outline" size={16} color={colors.greenLight} />
                      <Text style={[styles.reviewBtnText, { color: colors.greenLight }]}>Review & Decide</Text>
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
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.dashboard.textSecondary }]}>
          Pending Review ({pendingApps.length})
        </Text>
        {pendingApps.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
            <Ionicons name="checkmark-done-outline" size={48} color={colors.dashboard.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.dashboard.textPrimary }]}>All caught up!</Text>
            <Text style={[styles.emptySubtitle, { color: colors.dashboard.textSecondary }]}>No pending applications to review</Text>
          </View>
        ) : (
          pendingApps.map(app => renderAppCard(app, true))
        )}

        <Text style={[styles.sectionTitle, { color: colors.dashboard.textSecondary, marginTop: 20 }]}>
          Approval History ({historyApps.length})
        </Text>
        {historyApps.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
            <Ionicons name="time-outline" size={48} color={colors.dashboard.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.dashboard.textPrimary }]}>No history yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.dashboard.textSecondary }]}>Reviewed applications will appear here</Text>
          </View>
        ) : (
          historyApps.map(app => renderAppCard(app, false))
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
  expandedLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  expandedValue: { fontSize: 14, fontWeight: '500' },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  finKey: { fontSize: 13 },
  finVal: { fontSize: 13, fontWeight: '600' },
  actionSection: { marginTop: 14 },
  commentInput: { borderWidth: 1, borderRadius: borderRadius.sm, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  actionBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: borderRadius.sm },
  approveBtn: {},
  rejectBtn: {},
  actionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: borderRadius.sm, borderWidth: 1.5 },
  reviewBtnText: { fontSize: 14, fontWeight: '700' },
  expandHint: { alignItems: 'center', paddingBottom: 6 },
  emptyCard: { borderRadius: borderRadius.md, borderWidth: 1, alignItems: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
