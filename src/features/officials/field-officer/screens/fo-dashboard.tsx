import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ActionCard } from '@/features/officials/shared/components/action-card';
import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { StatCard } from '@/features/officials/shared/components/stat-card';
import { StatusBadge } from '@/features/officials/shared/components/status-badge';
import { borderRadius, contentMaxWidth, shadows } from '@/features/officials/shared/constants/layout';
import { useColors } from '@/features/officials/shared/constants/theme';
import { api } from '@/lib/api';
import type { ApiResponse, FieldVisitRow, ListResult, OfficerProfileRow, ProfileRow } from '@/lib/api-types';
import { MAX_LOAN_AMOUNT } from '@/lib/validation';

type Farmer = {
  id: string;
  name: string;
  location: string;
  crop: string;
  status: 'verified' | 'pending' | 'rejected';
};

// Map an assigned-farmer profile row to the card the dashboard renders.
const farmerFromRow = (row: ProfileRow): Farmer => ({
  id: String(row.id),
  name: row.name_en ?? row.name_bn ?? 'Farmer',
  location: [row.village, row.district].filter(Boolean).join(', ') || row.location || '—',
  crop: row.primary_crop ?? '—',
  status: row.is_verified ? 'verified' : 'pending',
});

type QuickActionKey = 'onboard' | 'visit' | 'apply' | 'verify';

const QUICK_ACTIONS: { key: QuickActionKey; icon: keyof typeof Ionicons.glyphMap; iconBg: string; title: string }[] = [
  { key: 'onboard', icon: 'person-add-outline', iconBg: '#3A9BD5', title: 'New Farmer\nOnboarding' },
  { key: 'visit', icon: 'location-outline', iconBg: '#1A8F5C', title: 'Record Visit' },
  { key: 'apply', icon: 'document-text-outline', iconBg: '#7C3AED', title: 'Submit\nApplication' },
  { key: 'verify', icon: 'shield-checkmark-outline', iconBg: '#F59E0B', title: 'Verify\nApplications' },
];

// A scheduled visit, mapped from the officer's visits endpoint. Time is the
// visit date; type is always 'Visit' (the backend has no visit taxonomy).
type ScheduledVisit = {
  time: string;
  title: string;
  location: string;
  type: string;
};

const visitFromRow = (row: FieldVisitRow): ScheduledVisit => {
  const d = new Date(String(row.visit_date ?? row.created_at ?? ''));
  const time = Number.isFinite(d.getTime())
    ? d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : '—';
  return {
    time,
    title: row.purpose ? `Field Visit — ${row.purpose}` : 'Field Visit',
    location: row.location ?? '—',
    type: 'Visit',
  };
};

export default function FieldOfficerDashboardScreen() {
  const router = useRouter();
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scheduledVisits, setScheduledVisits] = useState<ScheduledVisit[]>([]);
  // The officer's own profile (name/designation) from /profile/me.
  const [officer, setOfficer] = useState<OfficerProfileRow | null>(null);

  // ---- Quick action: farmer onboarding ----
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const emptyOnboard = { nameEn: '', nid: '', phone: '', password: '', village: '', district: '', primaryCrop: '' };
  const [onboardForm, setOnboardForm] = useState(emptyOnboard);

  // ---- Quick action: submit loan application ----
  const [applyOpen, setApplyOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const emptyApply = { farmerId: '', title: '', amount: '', duration: '', purpose: '', installmentType: 'monthly' as 'monthly' | 'seasonal' };
  const [applyForm, setApplyForm] = useState(emptyApply);
  const [showApplyFarmerPicker, setShowApplyFarmerPicker] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      // Assigned farmers: the officer's own list (server-scoped by token).
      const [farmersRes, visitsRes, profileRes] = await Promise.all([
        api.get<ApiResponse<ListResult<ProfileRow>>>('/api/field-officer/farmers?pageSize=100'),
        api.get<ApiResponse<ListResult<FieldVisitRow>>>('/api/field-officer/visits?pageSize=100'),
        api.get<ApiResponse<unknown> & { profile?: OfficerProfileRow }>('/api/field-officer/profile/me').catch(() => null),
      ]);
      setFarmers((farmersRes?.data?.items ?? []).map(farmerFromRow));
      // Today's view: scheduled + in-progress visits become the schedule list.
      const visitRows: FieldVisitRow[] = visitsRes?.data?.items ?? [];
      setScheduledVisits(visitRows.filter((v) => ['scheduled', 'in-progress'].includes(String(v.status ?? ''))).map(visitFromRow));
      // The profile endpoint answers { data: authUser, profile: officerRow }.
      setOfficer((profileRes as { profile?: OfficerProfileRow } | null)?.profile ?? null);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message ?? 'Could not load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Data fetch on mount. The kickoff is deferred out of the effect body;
    // state updates happen only after the fetch resolves.
    const timer = setTimeout(() => void loadDashboard(), 0);
    return () => clearTimeout(timer);
  }, [loadDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard().finally(() => setRefreshing(false));
  }, [loadDashboard]);

  const phoneValid = (p: string) => /^(?:\+?880)?1[3-9]\d{8}$|^01[3-9]\d{8}$/.test(p.replace(/[\s-]/g, ''));

  const runQuickAction = (key: QuickActionKey) => {
    if (key === 'onboard') {
      setOnboardForm(emptyOnboard);
      setOnboardOpen(true);
    } else if (key === 'visit') {
      router.push('/officials/visits?new=1');
    } else if (key === 'apply') {
      if (farmers.length === 0) {
        Alert.alert('No assigned farmers', 'You can only submit an application for a farmer assigned to you.');
        return;
      }
      setApplyForm(emptyApply);
      setShowApplyFarmerPicker(false);
      setApplyOpen(true);
    } else if (key === 'verify') {
      router.push('/officials/applications?tab=pending');
    }
  };

  const submitOnboarding = async () => {
    const f = onboardForm;
    if (!f.nameEn.trim() || !f.nid.trim() || !f.phone.trim() || !f.password) {
      Alert.alert('Missing details', 'Name, NID, mobile number and a temporary password are required.');
      return;
    }
    if (!/^\d{8,20}$/.test(f.nid.trim())) {
      Alert.alert('Invalid NID', 'Enter a valid NID (8–20 digits).');
      return;
    }
    if (!phoneValid(f.phone)) {
      Alert.alert('Invalid number', 'Enter a valid Bangladeshi mobile number.');
      return;
    }
    if (f.password.length < 6) {
      Alert.alert('Weak password', 'The temporary password must be at least 6 characters.');
      return;
    }
    setOnboarding(true);
    try {
      await api.post<ApiResponse<unknown>>('/api/field-officer/farmers', {
        nameEn: f.nameEn.trim(),
        nid: f.nid.trim(),
        phone: f.phone.trim(),
        password: f.password,
        village: f.village.trim() || undefined,
        district: f.district.trim() || undefined,
        selectedCrops: f.primaryCrop.trim() ? [f.primaryCrop.trim()] : undefined,
      });
      setOnboardOpen(false);
      await loadDashboard();
      Alert.alert('Farmer onboarded', `${f.nameEn.trim()} has been registered and assigned to you.`);
    } catch (err: any) {
      Alert.alert('Onboarding failed', err?.message ?? 'Could not register the farmer.');
    } finally {
      setOnboarding(false);
    }
  };

  const submitApplication = async () => {
    const f = applyForm;
    if (!f.farmerId || !f.title.trim() || !f.amount.trim() || !f.duration.trim() || !f.purpose.trim()) {
      Alert.alert('Missing details', 'Farmer, title, amount, duration and purpose are required.');
      return;
    }
    const amount = Number(f.amount.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a loan amount greater than 0.');
      return;
    }
    if (amount > MAX_LOAN_AMOUNT) {
      Alert.alert('Amount too large', 'Loan amount cannot exceed ৳1,00,00,000.');
      return;
    }
    setApplying(true);
    try {
      // Create the draft, then submit it into the review pipeline so it shows
      // up under "Pending Verification".
      const created = await api.post<ApiResponse<{ id: string }>>('/api/field-officer/loans', {
        farmerId: f.farmerId,
        title: f.title.trim(),
        amount,
        duration: f.duration.trim(),
        purpose: f.purpose.trim(),
        installmentType: f.installmentType,
      });
      const loanId = created?.data?.id;
      if (loanId) {
        await api.post<ApiResponse<unknown>>(`/api/field-officer/loans/${loanId}/submit`, {});
      }
      setApplyOpen(false);
      await loadDashboard();
      Alert.alert('Application submitted', 'The loan application is now pending your verification.');
    } catch (err: any) {
      Alert.alert('Submission failed', err?.message ?? 'Could not submit the application.');
    } finally {
      setApplying(false);
    }
  };

  const applyFarmerName = useMemo(
    () => farmers.find((x) => x.id === applyForm.farmerId)?.name ?? '',
    [farmers, applyForm.farmerId],
  );

  // Real counts derived from the same server-scoped lists rendered below.
  // Previously these four tiles showed hardcoded mock numbers.
  const pendingVerifications = farmers.filter((f) => f.status === 'pending').length;
  const visitsToday = scheduledVisits.filter((v) => v.time !== '—').length;

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
        {loadError ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.dashboard.redDown }]}>
            <View style={styles.emptyInner}>
              <Ionicons name="cloud-offline-outline" size={36} color={colors.dashboard.redDown} />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>Could not load your data</Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>{loadError}</Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>Pull down to retry.</Text>
            </View>
          </View>
        ) : null}
        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.deepGreen }]}>
          <View style={styles.heroRow}>
            <View style={styles.heroAvatar}>
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroGreeting}>Good morning,</Text>
              <Text style={styles.heroName}>{officer?.name_en ?? officer?.name_bn ?? 'Field Officer'}</Text>
              <Text style={styles.heroRole}>{officer?.designation ?? 'Field Officer'} • SOFOL</Text>
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            <StatCard hero icon="people" iconBg="#FFFFFF" value={String(farmers.length)} label="Assigned Farmers" />
            <StatCard hero icon="checkmark-circle" iconBg="#FFFFFF" value={String(scheduledVisits.length)} label="Scheduled Visits" />
          </View>
        </View>

        {/* Overview Stats */}
        <Text style={[styles.sectionLabel, { color: textSecondary }]}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="people-outline" iconBg="#3A9BD5" value={String(farmers.length)} label="Assigned Farmers" />
          <StatCard icon="time-outline" iconBg="#F59E0B" value={String(pendingVerifications)} label="Pending Verifications" />
          <StatCard icon="location-outline" iconBg="#1A8F5C" value={String(visitsToday)} label="Scheduled Visits" />
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionLabel, { color: textSecondary }]}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <ActionCard
              key={action.key}
              icon={action.icon}
              iconBg={action.iconBg}
              title={action.title}
              onPress={() => runQuickAction(action.key)}
            />
          ))}
        </View>

        {/* Today&apos;s Schedule */}
        <Text style={[styles.sectionLabel, { color: textSecondary }]}>Today&apos;s Schedule</Text>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          {scheduledVisits.length === 0 ? (
            <View style={styles.emptyInner}>
              <Ionicons name="calendar-outline" size={32} color={textSecondary} />
              <Text style={[styles.emptyInnerText, { color: textSecondary }]}>No tasks scheduled</Text>
            </View>
          ) : (
            scheduledVisits.map((task, i) => (
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
                {i < scheduledVisits.length - 1 && <View style={[styles.divider, { backgroundColor: border }]} />}
              </View>
             ))
          )}
        </View>

        {/* My Assigned Farmers */}
        <Text style={[styles.sectionLabel, { color: textSecondary }]}>My Assigned Farmers</Text>
        {farmers.length === 0 ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.emptyInner}>
              <Ionicons name="people-outline" size={40} color={textSecondary} />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>No assigned farmers</Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>Farmers assigned to you will appear here</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            {farmers.map((farmer, i) => (
              <View key={farmer.id} accessibilityLabel={`${farmer.name}, ${farmer.location}, ${farmer.status}`}>
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
                {i < farmers.length - 1 && <View style={[styles.divider, { backgroundColor: border }]} />}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Quick action: New Farmer Onboarding */}
      <Modal visible={onboardOpen} transparent animationType="slide" onRequestClose={() => setOnboardOpen(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>New Farmer Onboarding</Text>
              <Pressable onPress={() => setOnboardOpen(false)} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Full name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: bg, borderColor: border, color: textPrimary }]}
                placeholder="e.g. Rafiq Hasan"
                placeholderTextColor={textSecondary}
                value={onboardForm.nameEn}
                onChangeText={(v) => setOnboardForm((p) => ({ ...p, nameEn: v }))}
              />
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>National ID (NID) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: bg, borderColor: border, color: textPrimary }]}
                placeholder="e.g. 1990123456789"
                placeholderTextColor={textSecondary}
                keyboardType="number-pad"
                value={onboardForm.nid}
                onChangeText={(v) => setOnboardForm((p) => ({ ...p, nid: v }))}
              />
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Mobile number *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: bg, borderColor: border, color: textPrimary }]}
                placeholder="e.g. 01XXXXXXXXX"
                placeholderTextColor={textSecondary}
                keyboardType="phone-pad"
                value={onboardForm.phone}
                onChangeText={(v) => setOnboardForm((p) => ({ ...p, phone: v }))}
              />
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Temporary password *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: bg, borderColor: border, color: textPrimary }]}
                placeholder="Minimum 6 characters"
                placeholderTextColor={textSecondary}
                secureTextEntry
                value={onboardForm.password}
                onChangeText={(v) => setOnboardForm((p) => ({ ...p, password: v }))}
              />
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Village</Text>
              <TextInput
                style={[styles.input, { backgroundColor: bg, borderColor: border, color: textPrimary }]}
                placeholder="Optional"
                placeholderTextColor={textSecondary}
                value={onboardForm.village}
                onChangeText={(v) => setOnboardForm((p) => ({ ...p, village: v }))}
              />
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>District</Text>
              <TextInput
                style={[styles.input, { backgroundColor: bg, borderColor: border, color: textPrimary }]}
                placeholder="Optional"
                placeholderTextColor={textSecondary}
                value={onboardForm.district}
                onChangeText={(v) => setOnboardForm((p) => ({ ...p, district: v }))}
              />
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Primary crop</Text>
              <TextInput
                style={[styles.input, { backgroundColor: bg, borderColor: border, color: textPrimary }]}
                placeholder="Optional"
                placeholderTextColor={textSecondary}
                value={onboardForm.primaryCrop}
                onChangeText={(v) => setOnboardForm((p) => ({ ...p, primaryCrop: v }))}
              />
              <Pressable
                onPress={submitOnboarding}
                disabled={onboarding}
                accessibilityRole="button"
                accessibilityLabel="Register farmer"
                style={[styles.submitBtn, { backgroundColor: colors.greenLight }, onboarding && { opacity: 0.6 }]}>
                <Ionicons name="person-add" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>{onboarding ? 'Registering…' : 'Register Farmer'}</Text>
              </Pressable>
              <View style={{ height: 12 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Quick action: Submit Application */}
      <Modal visible={applyOpen} transparent animationType="slide" onRequestClose={() => setApplyOpen(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Submit Loan Application</Text>
              <Pressable onPress={() => setApplyOpen(false)} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Farmer *</Text>
              <Pressable
                onPress={() => setShowApplyFarmerPicker((s) => !s)}
                accessibilityRole="button"
                accessibilityLabel={applyFarmerName ? `Farmer: ${applyFarmerName}` : 'Select a farmer'}
                style={[styles.input, { backgroundColor: bg, borderColor: border }]}>
                <Text style={{ color: applyFarmerName ? textPrimary : textSecondary, flex: 1 }}>
                  {applyFarmerName || 'Select a farmer'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={textSecondary} />
              </Pressable>
              {showApplyFarmerPicker && (
                <View style={[styles.pickerDropdown, { backgroundColor: cardBg, borderColor: border }]}>
                  {farmers.map((f) => (
                    <Pressable
                      key={f.id}
                      accessibilityRole="button"
                      accessibilityLabel={f.name}
                      onPress={() => {
                        setApplyForm((p) => ({ ...p, farmerId: f.id }));
                        setShowApplyFarmerPicker(false);
                      }}
                      style={({ pressed }) => [
                        styles.pickerItem,
                        pressed && styles.pressed,
                        applyForm.farmerId === f.id && { backgroundColor: colors.greenLight + '10' },
                      ]}>
                      <Text style={[styles.pickerItemText, { color: textPrimary }]}>{f.name}</Text>
                      {applyForm.farmerId === f.id && <Ionicons name="checkmark" size={18} color={colors.greenLight} />}
                    </Pressable>
                  ))}
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: bg, borderColor: border, color: textPrimary }]}
                placeholder="e.g. Boro paddy input loan"
                placeholderTextColor={textSecondary}
                value={applyForm.title}
                onChangeText={(v) => setApplyForm((p) => ({ ...p, title: v }))}
              />
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Amount (Tk) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: bg, borderColor: border, color: textPrimary }]}
                placeholder="e.g. 50000"
                placeholderTextColor={textSecondary}
                keyboardType="number-pad"
                value={applyForm.amount}
                onChangeText={(v) => setApplyForm((p) => ({ ...p, amount: v }))}
              />
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Duration *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: bg, borderColor: border, color: textPrimary }]}
                placeholder="e.g. 12 months"
                placeholderTextColor={textSecondary}
                value={applyForm.duration}
                onChangeText={(v) => setApplyForm((p) => ({ ...p, duration: v }))}
              />
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Installment type *</Text>
              <View style={styles.segmentRow}>
                {(['monthly', 'seasonal'] as const).map((opt) => {
                  const active = applyForm.installmentType === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setApplyForm((p) => ({ ...p, installmentType: opt }))}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.segmentBtn,
                        { borderColor: border },
                        active && { backgroundColor: colors.greenLight + '15', borderColor: colors.greenLight },
                      ]}>
                      <Text style={[styles.segmentText, { color: active ? colors.greenLight : textSecondary }]}>
                        {opt === 'monthly' ? 'Monthly' : 'Seasonal'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Purpose *</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline, { backgroundColor: bg, borderColor: border, color: textPrimary }]}
                placeholder="What the loan will be used for"
                placeholderTextColor={textSecondary}
                multiline
                numberOfLines={3}
                value={applyForm.purpose}
                onChangeText={(v) => setApplyForm((p) => ({ ...p, purpose: v }))}
              />
              <Pressable
                onPress={submitApplication}
                disabled={applying}
                accessibilityRole="button"
                accessibilityLabel="Submit application"
                style={[styles.submitBtn, { backgroundColor: colors.greenLight }, applying && { opacity: 0.6 }]}>
                <Ionicons name="document-text" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>{applying ? 'Submitting…' : 'Submit Application'}</Text>
              </Pressable>
              <View style={{ height: 12 }} />
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
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
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: borderRadius.sm,
    marginTop: 20,
    marginBottom: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
