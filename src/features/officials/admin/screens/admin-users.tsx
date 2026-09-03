import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { useColors } from '@/features/officials/shared/constants/theme';
import { contentMaxWidth } from '@/features/officials/shared/constants/layout';
import {
  createFieldOfficer,
  fetchFieldOfficers,
  fetchRoleCounts,
  fetchUsers,
  resetFieldOfficerPassword,
  setFieldOfficerStatus,
  updateFieldOfficer,
  type AdminUserItem,
  type FieldOfficerItem,
  type RoleCounts,
} from '@/features/officials/admin/services/admin-api';

const TABS = [
  { key: 'farmer', label: 'Farmers' },
  { key: 'field_officer', label: 'Field Officers' },
  { key: 'bank_officer', label: 'Bank Officers' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const PAGE_SIZE = 20;
const AVATAR_COLORS = ['#047857', '#1D4ED8', '#7C3AED', '#B45309', '#BE185D', '#0D9488', '#4F46E5', '#C026D3'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

type StatusView = { label: string; kind: 'good' | 'warn' | 'bad' };
function statusView(item: AdminUserItem): StatusView {
  if (item.role === 'field_officer') {
    const s = (item.status || 'active').toLowerCase();
    if (s === 'active') return { label: 'Active', kind: 'good' };
    if (s === 'suspended') return { label: 'Suspended', kind: 'bad' };
    return { label: 'Inactive', kind: 'warn' };
  }
  if (item.is_verified) return { label: 'Verified', kind: 'good' };
  const s = (item.status || 'pending').toLowerCase();
  if (s === 'rejected' || s === 'suspended') return { label: 'Rejected', kind: 'bad' };
  return { label: 'Pending', kind: 'warn' };
}

export default function AdminUsersScreen() {
  const colors = useColors();

  const [activeTab, setActiveTab] = useState<TabKey>('farmer');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [items, setItems] = useState<AdminUserItem[]>([]);
  const [counts, setCounts] = useState<RoleCounts | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search box.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const fetchPage = useCallback(
    async (tab: TabKey, q: string, pageNum: number) => {
      if (tab === 'field_officer') {
        const res = await fetchFieldOfficers({ search: q || undefined, page: pageNum, pageSize: PAGE_SIZE });
        return { items: res.data.items as AdminUserItem[], pagination: res.data.pagination };
      }
      const res = await fetchUsers({ role: tab, search: q || undefined, page: pageNum, pageSize: PAGE_SIZE });
      return { items: res.data.items, pagination: res.data.pagination };
    },
    [],
  );

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const [listRes, countRes] = await Promise.all([
          fetchPage(activeTab, search, 1),
          fetchRoleCounts().catch(() => null),
        ]);
        setItems(listRes.items);
        setPage(1);
        setTotalPages(listRes.pagination.totalPages);
        if (countRes) setCounts(countRes.data);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load users');
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab, search, fetchPage],
  );

  useEffect(() => {
    const t = setTimeout(() => load('initial'), 0);
    return () => clearTimeout(t);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await fetchPage(activeTab, search, next);
      setItems((prev) => [...prev, ...res.items]);
      setPage(next);
      setTotalPages(res.pagination.totalPages);
    } catch {
      // keep what we have
    } finally {
      setLoadingMore(false);
    }
  }, [activeTab, search, page, totalPages, loadingMore, fetchPage]);

  const tabCount = (key: TabKey): number | null => {
    if (!counts) return null;
    if (key === 'farmer') return counts.farmer;
    if (key === 'field_officer') return counts.field_officer;
    return counts.bank_officer;
  };

  // ---- View modal ----
  const [viewItem, setViewItem] = useState<AdminUserItem | null>(null);

  // ---- Field officer create/edit form ----
  const emptyForm = {
    nameEn: '',
    nameBn: '',
    nid: '',
    phone: '',
    password: '',
    email: '',
    employeeId: '',
    designation: '',
    supervisedDistrict: '',
    supervisedUpazila: '',
    officeAddress: '',
  };
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setShowPassword(false);
    setFormOpen(true);
  };
  const openEdit = (fo: AdminUserItem) => {
    setEditingId(fo.id);
    setForm({
      ...emptyForm,
      nameEn: fo.name ?? '',
      phone: fo.phone ?? '',
      email: fo.email ?? '',
      employeeId: fo.employee_id ?? '',
      designation: fo.designation ?? '',
      supervisedDistrict: fo.supervised_district ?? '',
    });
    setFormErrors({});
    setShowPassword(false);
    setFormOpen(true);
  };

  const setField = (k: keyof typeof emptyForm, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setFormErrors((p) => ({ ...p, [k]: '' }));
  };

  // Accepts local (01XXXXXXXXX / 1XXXXXXXXX) or +880 forms; the server
  // normalises to E.164 on save.
  const phoneValid = (p: string) => /^(?:\+?880)?1[3-9]\d{8}$|^01[3-9]\d{8}$/.test(p.replace(/[\s-]/g, ''));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.nameEn.trim()) e.nameEn = 'Full name is required';
    if (!editingId) {
      if (!/^\d{8,20}$/.test(form.nid.trim())) e.nid = 'Enter a valid NID (8–20 digits)';
      if (!phoneValid(form.phone)) e.phone = 'Enter a valid Bangladeshi mobile number';
      if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    } else if (form.phone && !phoneValid(form.phone)) {
      e.phone = 'Enter a valid Bangladeshi mobile number';
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'Enter a valid email address';
    }
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const submitForm = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (editingId) {
        await updateFieldOfficer(editingId, {
          nameEn: form.nameEn.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          employeeId: form.employeeId.trim() || undefined,
          designation: form.designation.trim() || undefined,
          supervisedDistrict: form.supervisedDistrict.trim() || undefined,
          supervisedUpazila: form.supervisedUpazila.trim() || undefined,
          officeAddress: form.officeAddress.trim() || undefined,
        });
        setFormOpen(false);
        Alert.alert('Saved', `${form.nameEn.trim()} has been updated.`);
      } else {
        await createFieldOfficer({
          nameEn: form.nameEn.trim(),
          nameBn: form.nameBn.trim() || undefined,
          nid: form.nid.trim(),
          phone: form.phone.trim(),
          password: form.password,
          email: form.email.trim() || undefined,
          employeeId: form.employeeId.trim() || undefined,
          designation: form.designation.trim() || undefined,
          supervisedDistrict: form.supervisedDistrict.trim() || undefined,
          supervisedUpazila: form.supervisedUpazila.trim() || undefined,
          officeAddress: form.officeAddress.trim() || undefined,
        });
        setFormOpen(false);
        Alert.alert('Created', `Field officer ${form.nameEn.trim()} has been created.`);
        setActiveTab('field_officer');
      }
      load('refresh');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = (fo: AdminUserItem) => {
    const current = (fo.status || 'active').toLowerCase();
    const nextStatus = current === 'active' ? 'suspended' : 'active';
    const verb = nextStatus === 'active' ? 'Reactivate' : 'Suspend';
    Alert.alert(`${verb} field officer`, `${verb} ${fo.name}? This can be reversed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: verb,
        style: nextStatus === 'active' ? 'default' : 'destructive',
        onPress: async () => {
          try {
            await setFieldOfficerStatus(fo.id, nextStatus as 'active' | 'suspended');
            load('refresh');
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Failed to update status');
          }
        },
      },
    ]);
  };

  const [pwTarget, setPwTarget] = useState<AdminUserItem | null>(null);
  const [pwValue, setPwValue] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const submitPassword = async () => {
    if (!pwTarget) return;
    if (pwValue.length < 6) {
      Alert.alert('Invalid', 'Password must be at least 6 characters.');
      return;
    }
    setPwSubmitting(true);
    try {
      await resetFieldOfficerPassword(pwTarget.id, pwValue);
      setPwTarget(null);
      setPwValue('');
      Alert.alert('Done', `Password reset for ${pwTarget.name}.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to reset password');
    } finally {
      setPwSubmitting(false);
    }
  };

  const badgeColors = (kind: StatusView['kind']) =>
    kind === 'good'
      ? { bg: colors.userVerified, fg: colors.userVerifiedText }
      : kind === 'bad'
        ? { bg: colors.userRejected, fg: colors.userRejectedText }
        : { bg: colors.userPending, fg: colors.userPendingText };

  const renderCard = (item: AdminUserItem) => {
    const sv = statusView(item);
    const bc = badgeColors(sv.kind);
    const isFO = item.role === 'field_officer';
    const fo = item as FieldOfficerItem;
    const color = avatarColor(item.id);
    const metaBits = isFO
      ? [item.designation || 'Field Officer', item.supervised_district || '—', `${fo.assigned_farmers ?? 0} farmers`]
      : [item.location || '—', item.primary_crop || (item.role === 'bank_officer' ? 'Credit & Loans' : '—')];

    return (
      <View key={item.id} style={[styles.card, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.userBorder }]}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <View style={[styles.avatar, { backgroundColor: color + '18' }]}>
              <Text style={[styles.avatarText, { color }]}>{initials(item.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.dashboard.textPrimary }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.meta, { color: colors.dashboard.textSecondary }]} numberOfLines={1}>
                {metaBits.join('  ·  ')}
              </Text>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: bc.bg }]}>
            <Text style={[styles.badgeText, { color: bc.fg }]}>{sv.label}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.userView }, pressed && styles.pressed]}
            onPress={() => setViewItem(item)}>
            <Ionicons name="eye-outline" size={14} color={colors.userViewText} />
            <Text style={[styles.actionLabel, { color: colors.userViewText }]}>View</Text>
          </Pressable>
          {isFO && (
            <>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.userEdit }, pressed && styles.pressed]}
                onPress={() => openEdit(item)}>
                <Ionicons name="create-outline" size={14} color={colors.userEditText} />
                <Text style={[styles.actionLabel, { color: colors.userEditText }]}>Edit</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.userDeactivate }, pressed && styles.pressed]}
                onPress={() => changeStatus(item)}>
                <Ionicons
                  name={(item.status || 'active').toLowerCase() === 'active' ? 'ban-outline' : 'refresh-outline'}
                  size={14}
                  color={colors.userDeactivateText}
                />
                <Text style={[styles.actionLabel, { color: colors.userDeactivateText }]}>
                  {(item.status || 'active').toLowerCase() === 'active' ? 'Suspend' : 'Activate'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
        {isFO && (
          <Pressable onPress={() => setPwTarget(item)} style={styles.pwLink}>
            <Ionicons name="key-outline" size={13} color={colors.dashboard.textSecondary} />
            <Text style={[styles.pwLinkText, { color: colors.dashboard.textSecondary }]}>Reset password</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const sectionHeader = (icon: keyof typeof Ionicons.glyphMap, title: string) => (
    <View style={styles.formSection}>
      <Ionicons name={icon} size={14} color={colors.deepGreen} />
      <Text style={[styles.formSectionText, { color: colors.deepGreen }]}>{title}</Text>
    </View>
  );

  const field = (
    key: keyof typeof emptyForm,
    label: string,
    placeholder: string,
    opts: {
      icon?: keyof typeof Ionicons.glyphMap;
      prefix?: string;
      required?: boolean;
      secure?: boolean;
      helper?: string;
      keyboardType?: 'default' | 'phone-pad' | 'number-pad' | 'email-address';
    } = {},
  ) => {
    const err = formErrors[key];
    const isEmail = opts.keyboardType === 'email-address';
    return (
      <View style={styles.fieldBlock}>
        <Text style={[styles.fieldLabel, { color: colors.dashboard.textSecondary }]}>
          {label}
          {opts.required ? <Text style={{ color: colors.dashboard.redDown }}> *</Text> : null}
        </Text>
        <View
          style={[
            styles.fieldControl,
            {
              backgroundColor: colors.dashboard.bg,
              borderColor: err ? colors.dashboard.redDown : colors.userBorder,
            },
          ]}>
          {opts.prefix ? (
            <View style={[styles.fieldPrefix, { borderRightColor: colors.userBorder }]}>
              <Text style={[styles.fieldPrefixText, { color: colors.dashboard.textPrimary }]}>{opts.prefix}</Text>
            </View>
          ) : opts.icon ? (
            <Ionicons name={opts.icon} size={18} color={colors.dashboard.textSecondary} style={styles.fieldIcon} />
          ) : null}
          <TextInput
            style={[styles.fieldInput, { color: colors.dashboard.textPrimary }]}
            placeholder={placeholder}
            placeholderTextColor={colors.dashboard.textSecondary}
            value={form[key]}
            onChangeText={(v) => setField(key, v)}
            keyboardType={opts.keyboardType ?? 'default'}
            secureTextEntry={opts.secure && !showPassword}
            autoCapitalize={isEmail ? 'none' : 'sentences'}
            autoCorrect={!isEmail}
          />
          {opts.secure ? (
            <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8} style={styles.fieldTrailing}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.dashboard.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>
        {err ? (
          <Text style={[styles.fieldError, { color: colors.dashboard.redDown }]}>{err}</Text>
        ) : opts.helper ? (
          <Text style={[styles.fieldHelper, { color: colors.dashboard.textSecondary }]}>{opts.helper}</Text>
        ) : null}
      </View>
    );
  };

  const viewFields = useMemo(() => {
    if (!viewItem) return [];
    const rows: [string, string][] = [
      ['Name', viewItem.name],
      ['Role', viewItem.role.replace('_', ' ')],
      ['Email', viewItem.email || '—'],
      ['Phone', viewItem.phone || '—'],
    ];
    if (viewItem.role === 'field_officer') {
      const fo = viewItem as FieldOfficerItem;
      rows.push(
        ['Employee ID', viewItem.employee_id || '—'],
        ['Designation', viewItem.designation || '—'],
        ['District', viewItem.supervised_district || '—'],
        ['Assigned farmers', String(fo.assigned_farmers ?? 0)],
        ['Total visits', String(fo.total_visits ?? 0)],
      );
    } else {
      rows.push(
        ['Location', viewItem.location || '—'],
        ['Primary crop', viewItem.primary_crop || '—'],
      );
      if (viewItem.role === 'farmer') {
        rows.push(
          ['Farmer ID', viewItem.farmer_id || '—'],
          ['Credit score', String(viewItem.credit_score ?? 0)],
        );
      }
    }
    rows.push(['Member since', viewItem.member_since ? new Date(viewItem.member_since).toLocaleDateString() : '—']);
    return rows;
  }, [viewItem]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.userBg }]}>
      <ScreenHeader title="User Management" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={colors.deepGreen} colors={[colors.deepGreen]} />}>
        <View style={[styles.tabRow, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.userBorder }]}>
          {TABS.map((tab) => {
            const c = tabCount(tab.key);
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tab, activeTab === tab.key && { backgroundColor: colors.deepGreen }]}>
                <Text style={[styles.tabText, { color: colors.dashboard.textSecondary }, activeTab === tab.key && { color: '#FFFFFF' }]}>
                  {tab.label}
                </Text>
                {c !== null && (
                  <View style={[styles.tabCount, { backgroundColor: colors.userBg }, activeTab === tab.key && styles.tabCountActive]}>
                    <Text style={[styles.tabCountText, { color: colors.dashboard.textSecondary }, activeTab === tab.key && { color: '#FFFFFF' }]}>{c}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.searchRow, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.userBorder }]}>
          <Ionicons name="search-outline" size={18} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.dashboard.textPrimary }]}
            placeholder="Search by name, phone, ID..."
            placeholderTextColor={colors.dashboard.textSecondary}
            value={searchInput}
            onChangeText={setSearchInput}
          />
          {searchInput.length > 0 && (
            <Pressable onPress={() => setSearchInput('')}>
              <Ionicons name="close-circle" size={18} color={colors.dashboard.textSecondary} />
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.deepGreen} />
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.dashboard.textSecondary} />
            <Text style={[styles.errorText, { color: colors.dashboard.textPrimary }]}>{error}</Text>
            <Pressable onPress={() => load('initial')} style={[styles.retryBtn, { backgroundColor: colors.deepGreen }]}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centerBox}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.userBorder }]}>
              <Ionicons name="people-outline" size={44} color={colors.userBorder} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.dashboard.textPrimary }]}>No users found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.dashboard.textSecondary }]}>
              {search ? 'Try a different search' : `No ${TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} yet`}
            </Text>
          </View>
        ) : (
          <>
            {items.map(renderCard)}
            {page < totalPages && (
              <Pressable
                onPress={loadMore}
                style={[styles.loadMore, { borderColor: colors.userBorder, backgroundColor: colors.dashboard.cardBg }]}>
                {loadingMore ? (
                  <ActivityIndicator color={colors.deepGreen} size="small" />
                ) : (
                  <Text style={[styles.loadMoreText, { color: colors.deepGreen }]}>Load more</Text>
                )}
              </Pressable>
            )}
          </>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      <Pressable
        onPress={openCreate}
        style={({ pressed }) => [{ backgroundColor: colors.deepGreen }, styles.fab, pressed && { opacity: 0.9 }]}>
        <Ionicons name="add" size={22} color="#FFFFFF" />
        <Text style={styles.fabText}>Add Field Officer</Text>
      </Pressable>

      {/* View modal */}
      <Modal visible={!!viewItem} transparent animationType="fade" onRequestClose={() => setViewItem(null)}>
        <Pressable style={styles.overlay} onPress={() => setViewItem(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.dashboard.cardBg }]} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.dashboard.textPrimary }]}>User Details</Text>
              <Pressable onPress={() => setViewItem(null)}>
                <Ionicons name="close" size={22} color={colors.dashboard.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              {viewFields.map(([k, v]) => (
                <View key={k} style={[styles.viewRow, { borderBottomColor: colors.dashboard.border }]}>
                  <Text style={[styles.viewKey, { color: colors.dashboard.textSecondary }]}>{k}</Text>
                  <Text style={[styles.viewVal, { color: colors.dashboard.textPrimary }]}>{v}</Text>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Create / edit field officer */}
      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView style={styles.sheetRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setFormOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.dashboard.cardBg }]}>
            <View style={[styles.sheetGrabber, { backgroundColor: colors.userBorder }]} />

            <View style={[styles.sheetHeader, { borderBottomColor: colors.dashboard.border }]}>
              <View style={styles.sheetHeaderLeft}>
                <View style={[styles.sheetHeaderIcon, { backgroundColor: colors.deepGreen + '18' }]}>
                  <Ionicons name={editingId ? 'create-outline' : 'person-add-outline'} size={19} color={colors.deepGreen} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetTitle, { color: colors.dashboard.textPrimary }]}>
                    {editingId ? 'Edit Field Officer' : 'Add Field Officer'}
                  </Text>
                  <Text style={[styles.sheetSubtitle, { color: colors.dashboard.textSecondary }]}>
                    {editingId ? 'Update this officer’s details' : 'Create a new field officer account'}
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => setFormOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.dashboard.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.sheetBody}
              contentContainerStyle={styles.sheetBodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {sectionHeader('person-outline', 'Identity')}
              {field('nameEn', 'Full name (English)', 'e.g. Rafiq Hasan', { icon: 'person-outline', required: true })}
              {!editingId && field('nameBn', 'Full name (Bangla)', 'নাম', { icon: 'language-outline' })}
              {!editingId &&
                field('nid', 'National ID (NID)', 'e.g. 1990123456789', {
                  icon: 'card-outline',
                  required: true,
                  keyboardType: 'number-pad',
                })}

              {!editingId && sectionHeader('lock-closed-outline', 'Login credentials')}
              {!editingId &&
                field('password', 'Temporary password', 'Minimum 6 characters', {
                  icon: 'key-outline',
                  required: true,
                  secure: true,
                  helper: 'The officer signs in with their NID or phone number and this password.',
                })}

              {sectionHeader('call-outline', 'Contact')}
              {field('phone', 'Mobile number', '1XXXXXXXXX', {
                prefix: '+880',
                required: !editingId,
                keyboardType: 'phone-pad',
              })}
              {field('email', 'Email address', 'officer@example.com', {
                icon: 'mail-outline',
                keyboardType: 'email-address',
              })}

              {sectionHeader('briefcase-outline', 'Work assignment')}
              {field('employeeId', 'Employee ID', 'e.g. FO-1042', { icon: 'id-card-outline' })}
              {field('designation', 'Designation', 'e.g. Senior Field Officer', { icon: 'ribbon-outline' })}
              {field('supervisedDistrict', 'Supervised district', 'e.g. Bhola', { icon: 'map-outline' })}
              {field('supervisedUpazila', 'Supervised upazila', 'e.g. Char Fasson', { icon: 'navigate-outline' })}
              {field('officeAddress', 'Office address', 'e.g. SOFOL Branch Office, Bhola Sadar', { icon: 'business-outline' })}
            </ScrollView>

            <View style={[styles.sheetFooter, { borderTopColor: colors.dashboard.border }]}>
              <Pressable
                onPress={() => setFormOpen(false)}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.sheetCancelBtn,
                  { borderColor: colors.userBorder },
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.sheetCancelText, { color: colors.dashboard.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={submitForm}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.sheetSubmitBtn,
                  { backgroundColor: colors.deepGreen },
                  (submitting || pressed) && { opacity: 0.85 },
                ]}>
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name={editingId ? 'checkmark-circle' : 'person-add'} size={18} color="#FFFFFF" />
                    <Text style={styles.sheetSubmitText}>{editingId ? 'Save changes' : 'Create field officer'}</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reset password */}
      <Modal visible={!!pwTarget} transparent animationType="fade" onRequestClose={() => setPwTarget(null)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.overlay} onPress={() => setPwTarget(null)}>
            <Pressable style={[styles.modalCard, { backgroundColor: colors.dashboard.cardBg }]} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.dashboard.textPrimary }]}>Reset Password</Text>
                <Pressable onPress={() => setPwTarget(null)}>
                  <Ionicons name="close" size={22} color={colors.dashboard.textSecondary} />
                </Pressable>
              </View>
              <Text style={[styles.fieldLabel, { color: colors.dashboard.textSecondary }]}>
                New password for {pwTarget?.name}
              </Text>
              <TextInput
                style={[styles.input, { color: colors.dashboard.textPrimary, backgroundColor: colors.dashboard.bg, borderColor: colors.userBorder }]}
                placeholder="Min 6 characters"
                placeholderTextColor={colors.dashboard.textSecondary}
                secureTextEntry
                value={pwValue}
                onChangeText={setPwValue}
              />
              <Pressable
                onPress={submitPassword}
                disabled={pwSubmitting}
                style={[styles.submitBtn, { backgroundColor: colors.deepGreen }, pwSubmitting && { opacity: 0.7 }]}>
                {pwSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Reset password</Text>}
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 16, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
  tabRow: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 16, borderWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 11 },
  tabText: { fontSize: 12, fontWeight: '600' },
  tabCount: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabCountText: { fontSize: 11, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, gap: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  errorText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 10 },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
  card: { borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 10 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  name: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  meta: { fontSize: 12, lineHeight: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 12 },
  actionLabel: { fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  pwLink: { flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'center', marginTop: 10 },
  pwLinkText: { fontSize: 12, fontWeight: '600' },
  loadMore: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  loadMoreText: { fontSize: 13, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 20, left: 16, right: 16, maxWidth: contentMaxWidth, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  fabText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 500, borderRadius: 20, padding: 22, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  viewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  viewKey: { fontSize: 13, fontWeight: '500' },
  viewVal: { fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'right', textTransform: 'capitalize' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 7 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, marginTop: 8 },
  fieldError: { fontSize: 12, marginTop: 5, marginLeft: 2, fontWeight: '500' },
  submitBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 22, marginBottom: 8 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // ---- Add / Edit Field Officer bottom sheet ----
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 8 : 0,
    overflow: 'hidden',
  },
  sheetGrabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  sheetHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  sheetHeaderIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  sheetSubtitle: { fontSize: 12.5, marginTop: 1 },
  sheetBody: { paddingHorizontal: 20, flexShrink: 1 },
  sheetBodyContent: { paddingTop: 4, paddingBottom: 16 },

  formSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 20,
    marginBottom: 10,
  },
  formSectionText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },

  fieldBlock: { marginBottom: 14 },
  fieldControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 50,
    paddingRight: 12,
  },
  fieldIcon: { marginLeft: 14, marginRight: 2 },
  fieldPrefix: {
    alignSelf: 'stretch',
    minHeight: 48,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldPrefixText: { fontSize: 14, fontWeight: '700' },
  fieldInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  fieldTrailing: { paddingLeft: 6 },
  fieldHelper: { fontSize: 11.5, marginTop: 5, marginLeft: 2, lineHeight: 16 },

  sheetFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
  },
  sheetCancelBtn: {
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelText: { fontSize: 14, fontWeight: '700' },
  sheetSubmitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  sheetSubmitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
