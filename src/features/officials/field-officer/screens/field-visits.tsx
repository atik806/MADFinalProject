import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { borderRadius, contentMaxWidth, shadows } from '@/features/officials/shared/constants/layout';
import { useColors } from '@/features/officials/shared/constants/theme';
import { api } from '@/lib/api';
import type { ApiResponse, FieldVisitRow, ListResult, ProfileRow } from '@/lib/api-types';

type VisitStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

type FieldVisit = {
  id: string;
  farmerName: string;
  farmerId: string | null;
  location: string;
  date: string;
  purpose: string;
  status: VisitStatus;
  notes: string;
};

// Backend visit row → the card the screen renders. The visits endpoint does
// NOT embed a farmer summary (unlike the loans endpoint), so the farmer name
// is resolved locally from the officer's assigned-farmer list.
const visitFromRow = (row: FieldVisitRow, farmerName: string): FieldVisit => ({
  id: String(row.id),
  farmerName,
  farmerId: row.farmer_id ?? null,
  location: row.location ?? '—',
  date: (() => {
    const d = new Date(String(row.visit_date ?? row.created_at ?? ''));
    return Number.isFinite(d.getTime())
      ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';
  })(),
  purpose: row.purpose ?? '—',
  status: String(row.status ?? 'scheduled') as VisitStatus,
  notes: row.notes ?? '',
});

function getStatusConfig(status: VisitStatus) {
  switch (status) {
    case 'scheduled':
      return { bg: '#DBEAFE', color: '#1E40AF', icon: 'calendar' as const, label: 'Scheduled' };
    case 'in-progress':
      return { bg: '#FEF3C7', color: '#92400E', icon: 'time' as const, label: 'In Progress' };
    case 'completed':
      return { bg: '#D1FAE5', color: '#065F46', icon: 'checkmark-circle' as const, label: 'Completed' };
    case 'cancelled':
      return { bg: '#FEE2E2', color: '#991B1B', icon: 'close-circle' as const, label: 'Cancelled' };
  }
}

export default function FieldVisitsScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [upcoming, setUpcoming] = useState<FieldVisit[]>([]);
  const [completed, setCompleted] = useState<FieldVisit[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Assigned farmers from the officer's own list — used both for the visit
  // cards' context and the schedule-visit farmer picker.
  const [assignedFarmers, setAssignedFarmers] = useState<{ id: string; name: string }[]>([]);

  // Form state
  const [formFarmer, setFormFarmer] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [showFarmerPicker, setShowFarmerPicker] = useState(false);

  const loadVisits = useCallback(async () => {
    try {
      const [visitsRes, farmersRes] = await Promise.all([
        api.get<ApiResponse<ListResult<FieldVisitRow>>>('/api/field-officer/visits?pageSize=100'),
        api.get<ApiResponse<ListResult<ProfileRow>>>('/api/field-officer/farmers?pageSize=100'),
      ]);
      const farmerRows: ProfileRow[] = farmersRes?.data?.items ?? [];
      const nameByFarmerId = new Map(
        farmerRows.map((f) => [String(f.id), f.name_en ?? f.name_bn ?? 'Farmer']),
      );
      const rows: FieldVisitRow[] = visitsRes?.data?.items ?? [];
      const mapped = rows.map((v) => visitFromRow(v, nameByFarmerId.get(String(v.farmer_id)) ?? 'Farmer'));
      setUpcoming(mapped.filter((v) => v.status === 'scheduled' || v.status === 'in-progress'));
      setCompleted(mapped.filter((v) => v.status === 'completed' || v.status === 'cancelled'));
      setAssignedFarmers(
        farmerRows.map((f) => ({ id: String(f.id), name: f.name_en ?? f.name_bn ?? 'Farmer' })),
      );
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message ?? 'Could not load your visits.');
    }
  }, []);

  useEffect(() => {
    // Data fetch on mount. The kickoff is deferred out of the effect body;
    // state updates happen only after the fetch resolves.
    const timer = setTimeout(() => void loadVisits(), 0);
    return () => clearTimeout(timer);
  }, [loadVisits]);

  const bg = colors.dashboard.bg;
  const cardBg = colors.dashboard.cardBg;
  const textPrimary = colors.dashboard.textPrimary;
  const textSecondary = colors.dashboard.textSecondary;
  const border = colors.dashboard.border;

  const visits = activeTab === 'upcoming' ? upcoming : completed;

  const handleScheduleVisit = async () => {
    if (!formFarmer || !formDate || !formPurpose || submitting) return;

    const farmer = assignedFarmers.find((f) => f.name === formFarmer);
    if (!farmer) return;

    setSubmitting(true);
    try {
      // visitDate accepts an ISO date; the backend validates and scopes the
      // visit to the officer's assignment for that farmer.
      await api.post<ApiResponse<FieldVisitRow>>('/api/field-officer/visits', {
        farmerId: farmer.id,
        visitDate: formDate,
        purpose: formPurpose,
        notes: formNotes,
      });
      setModalVisible(false);
      setFormFarmer('');
      setFormDate('');
      setFormPurpose('');
      setFormNotes('');
      await loadVisits();
    } catch (err: any) {
      Alert.alert('Schedule Visit', err?.message ?? 'Could not schedule the visit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <ScreenHeader title="Field Visits" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Tabs */}
        <View style={[styles.tabRow, { backgroundColor: cardBg, borderColor: border }]}>
          {(['upcoming', 'completed'] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabBtn, active && { backgroundColor: colors.greenLight + '15' }]}>
                <Ionicons
                  name={tab === 'upcoming' ? 'calendar-outline' : 'checkmark-done-outline'}
                  size={14}
                  color={active ? colors.greenLight : textSecondary}
                />
                <Text style={[styles.tabLabel, { color: active ? colors.greenLight : textSecondary }]}>
                  {tab === 'upcoming' ? 'Upcoming' : 'Completed'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Visit List */}
        {loadError ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.dashboard.redDown }]}>
            <View style={styles.emptyInner}>
              <Ionicons name="cloud-offline-outline" size={48} color={colors.dashboard.redDown} />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>Could not load visits</Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>{loadError}</Text>
            </View>
          </View>
        ) : visits.length === 0 ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.emptyInner}>
              <Ionicons
                name={activeTab === 'upcoming' ? 'calendar-outline' : 'checkmark-done-outline'}
                size={48}
                color={textSecondary}
              />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                {activeTab === 'upcoming' ? 'No upcoming visits' : 'No completed visits'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                {activeTab === 'upcoming'
                  ? 'Schedule a field visit using the button below'
                  : 'Completed visits will appear here'}
              </Text>
            </View>
          </View>
        ) : (
          visits.map((visit) => {
            const expanded = expandedId === visit.id;
            const statusCfg = getStatusConfig(visit.status);

            return (
              <View key={visit.id} style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
                <Pressable
                  onPress={() => setExpandedId(expanded ? null : visit.id)}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <View style={styles.visitHeader}>
                    <View style={styles.visitAvatar}>
                      <Ionicons name="person-circle" size={36} color={colors.greenLight} />
                    </View>
                    <View style={styles.visitInfo}>
                      <Text style={[styles.visitFarmer, { color: textPrimary }]}>{visit.farmerName}</Text>
                      <Text style={[styles.visitPurpose, { color: textSecondary }]}>{visit.purpose}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                      <Ionicons name={statusCfg.icon} size={10} color={statusCfg.color} />
                      <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                    </View>
                  </View>

                  <View style={styles.visitMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={14} color={textSecondary} />
                      <Text style={[styles.metaText, { color: textPrimary }]}>{visit.location}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={14} color={textSecondary} />
                      <Text style={[styles.metaText, { color: textPrimary }]}>{visit.date}</Text>
                    </View>
                  </View>

                  {expanded && (
                    <View style={[styles.expandedArea, { borderTopColor: border }]}>
                      <Text style={[styles.expandedLabel, { color: textSecondary }]}>Notes</Text>
                      <Text style={[styles.notesText, { color: textPrimary }]}>{visit.notes}</Text>
                      {activeTab === 'upcoming' && (
                        <Pressable
                          style={[styles.actionBtn, { backgroundColor: colors.greenLight }]}
                          onPress={() => {
                            setUpcoming((prev) =>
                              prev.map((v) =>
                                v.id === visit.id ? { ...v, status: 'in-progress' as VisitStatus } : v,
                              ),
                            );
                          }}>
                          <Ionicons name="play" size={16} color="#FFFFFF" />
                          <Text style={styles.actionBtnText}>Start Visit</Text>
                        </Pressable>
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

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => setModalVisible(true)}
        style={[styles.fab, { backgroundColor: colors.greenLight }]}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {/* Schedule Visit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Schedule Visit</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalForm}>
              {/* Farmer Selection */}
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Farmer</Text>
              <Pressable
                onPress={() => setShowFarmerPicker(!showFarmerPicker)}
                style={[styles.input, { backgroundColor: bg, borderColor: border }]}>
                <Text style={{ color: formFarmer ? textPrimary : textSecondary, flex: 1 }}>
                  {formFarmer || 'Select a farmer'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={textSecondary} />
              </Pressable>
              {showFarmerPicker && (
                <View style={[styles.pickerDropdown, { backgroundColor: cardBg, borderColor: border }]}>
                  {assignedFarmers.map((f) => (
                    <Pressable
                      key={f.id}
                      onPress={() => {
                        setFormFarmer(f.name);
                        setShowFarmerPicker(false);
                      }}
                      style={({ pressed }) => [
                        styles.pickerItem,
                        pressed && styles.pressed,
                        formFarmer === f.name && { backgroundColor: colors.greenLight + '10' },
                      ]}>
                      <Text style={[styles.pickerItemText, { color: textPrimary }]}>{f.name}</Text>
                      {formFarmer === f.name && (
                        <Ionicons name="checkmark" size={18} color={colors.greenLight} />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Date */}
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: bg, borderColor: border, color: textPrimary }]}
                placeholder="e.g. 10 Jul 2026"
                placeholderTextColor={textSecondary}
                value={formDate}
                onChangeText={setFormDate}
              />

              {/* Purpose */}
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Purpose</Text>
              <TextInput
                style={[styles.input, { backgroundColor: bg, borderColor: border, color: textPrimary }]}
                placeholder="e.g. Crop Inspection"
                placeholderTextColor={textSecondary}
                value={formPurpose}
                onChangeText={setFormPurpose}
              />

              {/* Notes */}
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Notes</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.inputMultiline,
                  { backgroundColor: bg, borderColor: border, color: textPrimary },
                ]}
                placeholder="Optional notes..."
                placeholderTextColor={textSecondary}
                value={formNotes}
                onChangeText={setFormNotes}
                multiline
                numberOfLines={3}
              />

              {/* Submit */}
              <Pressable
                onPress={handleScheduleVisit}
                disabled={!formFarmer || !formDate || !formPurpose}
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.greenLight },
                  (!formFarmer || !formDate || !formPurpose) && { opacity: 0.5 },
                ]}>
                <Ionicons name="calendar" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Schedule Visit</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    ...shadows.cardSubtle,
    marginBottom: 10,
  },
  visitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 8,
    gap: 10,
  },
  visitAvatar: {},
  visitInfo: {
    flex: 1,
  },
  visitFarmer: {
    fontSize: 15,
    fontWeight: '700',
  },
  visitPurpose: {
    fontSize: 12,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  visitMeta: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 14,
    paddingBottom: 8,
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
    marginBottom: 6,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    marginTop: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.elevated,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalForm: {
    paddingHorizontal: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  pickerDropdown: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerItemText: {
    fontSize: 14,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: borderRadius.sm,
    marginTop: 20,
    marginBottom: 16,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
