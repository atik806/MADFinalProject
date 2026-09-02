import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
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

import { UserCard } from '@/features/officials/admin/components/user-card';
import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { useColors } from '@/features/officials/shared/constants/theme';
import { contentMaxWidth } from '@/features/officials/shared/constants/layout';
import { api } from '@/lib/api';
import type { AdminDirectoryRow, ApiResponse, ListResult, ProfileRow } from '@/lib/api-types';

type User = {
  id: string;
  name: string;
  role: 'Farmer' | 'Field Officer' | 'Bank Officer';
  location: string;
  crop: string;
  status: 'verified' | 'pending' | 'rejected';
};

// Backend directory row → the card the screen renders. Role text and the
// status badge keep the screen's existing visual language: bank/field
// officers show verified/pending by account status; farmers by is_verified.
const ROLE_FROM_BACKEND: Record<string, User['role']> = {
  farmer: 'Farmer',
  field_officer: 'Field Officer',
  bank_officer: 'Bank Officer',
};

const userFromRow = (row: AdminDirectoryRow): User => {
  const role = ROLE_FROM_BACKEND[String(row.role ?? '').toLowerCase()] ?? 'Farmer';
  const status = String(row.status ?? '').toLowerCase();
  const badgeStatus: User['status'] =
    status === 'active'
      ? 'verified'
      : status === 'inactive' || status === 'suspended'
        ? 'rejected'
        : 'pending';
  return {
    id: String(row.id),
    name: row.name_en ?? row.name_bn ?? 'Unnamed',
    role,
    location: [row.district, row.village].filter(Boolean).join(', ') || '—',
    crop: role === 'Farmer'
      ? (row.farmer_id ?? '—')
      : (row.designation ?? row.employee_id ?? '—'),
    status: role === 'Farmer' && row.is_verified === true ? 'verified' : badgeStatus,
  };
};

const ROLE_FILTER: Record<Tab, string> = {
  Farmers: 'farmer',
  'Field Officers': 'field_officer',
  'Bank Officers': 'bank_officer',
};

const TABS = ['Farmers', 'Field Officers', 'Bank Officers'] as const;
type Tab = (typeof TABS)[number];

const SKELETON_OPACITY = 0.3;
function SkeletonCard() {
  const colors = useColors();
  const opacity = useMemo(() => new Animated.Value(SKELETON_OPACITY), []);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: SKELETON_OPACITY, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  const cardStyle = {
    backgroundColor: colors.dashboard.cardBg,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.userBorder,
  };

  const avatarStyle = { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.userBorder };
  const lineStyle = { height: 14, borderRadius: 7, backgroundColor: colors.userBorder };
  const actionStyle = { flex: 1, height: 36, borderRadius: 12, backgroundColor: colors.userBorder };

  return (
    <View style={cardStyle}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <Animated.View style={[avatarStyle, { opacity }]} />
        <View style={{ flex: 1, gap: 8 }}>
          <Animated.View style={[{ width: '60%' }, lineStyle, { opacity }]} />
          <Animated.View style={[{ width: '40%' }, lineStyle, { opacity }]} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Animated.View style={[actionStyle, { opacity }]} />
        <Animated.View style={[actionStyle, { opacity }]} />
        <Animated.View style={[actionStyle, { opacity }]} />
      </View>
    </View>
  );
}

export default function AdminUsersScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<Tab>('Farmers');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewUser, setViewUser] = useState<User | null>(null);

  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formCrop, setFormCrop] = useState('');
  const [formNid, setFormNid] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadUsers = useCallback(
    async (tab: Tab, searchTerm: string) => {
      try {
        const params = new URLSearchParams({
          role: ROLE_FILTER[tab],
          pageSize: '100',
        });
        if (searchTerm.trim()) {
          params.set('search', searchTerm.trim());
        }
        const res = await api.get<ApiResponse<ListResult<AdminDirectoryRow>>>(`/api/admin/users?${params.toString()}`);
        setUsers((res?.data?.items ?? []).map(userFromRow));
        setLoadError(null);
      } catch (err: any) {
        setUsers([]);
        setLoadError(err?.message ?? 'Could not load users.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    // Debounce so typing in search does not fire a request per keystroke.
    // The kickoff is deferred out of the effect body; state updates happen
    // only after fetches resolve.
    const timer = setTimeout(() => {
      setLoading(true);
      void loadUsers(activeTab, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [activeTab, search, loadUsers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsers(activeTab, search).finally(() => setRefreshing(false));
  }, [activeTab, search, loadUsers]);

  const filtered = users;

  const totalByTab = (tab: Tab) => (tab === activeTab ? users.length : 0);

  const openViewModal = (user: User) => {
    setViewUser(user);
    setViewModalVisible(true);
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormLocation('');
    setFormCrop('');
    setFormNid('');
    setFormPhone('');
    setFormPassword('');
    setFormErrors({});
    setFormModalVisible(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormLocation(user.location === '—' ? '' : user.location);
    setFormCrop(user.crop === '—' ? '' : user.crop);
    setFormNid('');
    setFormPhone('');
    setFormPassword('');
    setFormErrors({});
    setFormModalVisible(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = 'Name is required';
    if (!editingUser) {
      // Creating a field officer requires identity + contact + credentials.
      if (!formNid.trim()) errors.nid = 'NID is required';
      if (!formPhone.trim()) errors.phone = 'Phone is required';
      if (formPassword.trim().length < 6) errors.password = 'Password must be at least 6 characters';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || submitting) return;
    setSubmitting(true);
    try {
      if (editingUser) {
        // Officer detail edit: only the designation/district/phone fields the
        // backend's update white-list accepts. Role/location edits beyond
        // that are not supported by the API for this row type.
        await api.put<ApiResponse<ProfileRow>>(`/api/admin/field-officers/${editingUser.id}`, {
          name_en: formName.trim(),
          designation: formCrop.trim() || undefined,
          supervised_district: formLocation.trim() || undefined,
        });
        Alert.alert('Success', `${formName.trim()} has been updated.`);
      } else {
        // Create: the only staff role the backend can provision today.
        const res = await api.post<ApiResponse<{ profile: ProfileRow }>>('/api/admin/field-officers', {
          nameEn: formName.trim(),
          nid: formNid.trim(),
          phone: formPhone.trim(),
          password: formPassword.trim(),
          designation: formCrop.trim() || undefined,
          supervisedDistrict: formLocation.trim() || undefined,
        });
        const created = res?.data?.profile;
        Alert.alert(
          'Success',
          `${created?.name_en ?? formName.trim()} has been added as a Field Officer.`,
        );
      }
      setFormModalVisible(false);
      // Edit applies to the officer already on screen; create lands the new
      // officer in the Field Officers tab. Either way the directory is
      // re-fetched so it reflects the server's truth.
      const tabAfterSubmit: Tab = editingUser ? activeTab : 'Field Officers';
      setActiveTab(tabAfterSubmit);
      setLoading(true);
      await loadUsers(tabAfterSubmit, search);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'The request failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = (user: User) => {
    const isActive = user.status === 'verified';
    Alert.alert(
      isActive ? 'Deactivate User' : 'Reactivate User',
      isActive
        ? `Suspend ${user.name}'s account? They will lose API access immediately. This action can be reversed.`
        : `Reactivate ${user.name}'s account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: isActive ? 'destructive' : 'default',
          onPress: async () => {
            if (statusUpdatingId) return;
            setStatusUpdatingId(user.id);
            try {
              await api.patch<ApiResponse<AdminDirectoryRow>>(`/api/admin/users/${user.id}/status`, {
                status: isActive ? 'suspended' : 'active',
              });
              setUsers((prev) =>
                prev.map((u) =>
                  u.id === user.id ? { ...u, status: isActive ? 'rejected' : 'verified' } : u,
                ),
              );
              Alert.alert('Done', `${user.name} has been ${isActive ? 'suspended' : 'reactivated'}.`);
            } catch (err: any) {
              // Includes the backend's admin-row refusal — surfaced verbatim.
              Alert.alert('Error', err?.message ?? 'Could not update the account status.');
            } finally {
              setStatusUpdatingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.userBg }]}>
      <ScreenHeader
        title="User Management"
        actions={[
          { icon: 'language-outline', accessibilityLabel: 'Language' },
          { icon: 'notifications-outline', accessibilityLabel: 'Notifications' },
        ]}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.deepGreen} colors={[colors.deepGreen]} />}>
        <View style={[styles.tabRow, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.userBorder }]}>
          {TABS.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && { backgroundColor: colors.deepGreen }]}>
              <Text style={[styles.tabText, { color: colors.dashboard.textSecondary }, activeTab === tab && { color: '#FFFFFF' }]}>
                {tab}
              </Text>
              <View style={[styles.tabCount, { backgroundColor: colors.userBg }, activeTab === tab && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, { color: colors.dashboard.textSecondary }, activeTab === tab && { color: '#FFFFFF' }]}>
                  {totalByTab(tab)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={[styles.searchRow, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.userBorder }]}>
          <Ionicons name="search-outline" size={18} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.dashboard.textPrimary }]}
            placeholder="Search by name, location or crop..."
            placeholderTextColor={colors.dashboard.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.dashboard.textSecondary} />
            </Pressable>
          )}
        </View>

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : loadError ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.redDown }]}>
              <Ionicons name="cloud-offline-outline" size={48} color={colors.dashboard.redDown} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.dashboard.textPrimary }]}>Could not load users</Text>
            <Text style={[styles.emptySubtitle, { color: colors.dashboard.textSecondary }]}>{loadError}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.dashboard.textSecondary }]}>Pull down to retry.</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.userBorder }]}>
              <Ionicons name="people-outline" size={48} color={colors.userBorder} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.dashboard.textPrimary }]}>No users found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.dashboard.textSecondary }]}>
              {search ? 'Try adjusting your search query' : `No ${activeTab.toLowerCase()} registered yet`}
            </Text>
          </View>
        ) : (
          filtered.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onView={(u) => openViewModal(u)}
              onEdit={(u) => openEditModal(u)}
              onDeactivate={(u) => handleDeactivate(u)}
            />
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <Pressable
        onPress={openAddModal}
        style={({ pressed }) => [{ backgroundColor: colors.deepGreen, ...styles.fabBase }, pressed && styles.fabPressed]}>
        <Ionicons name="add" size={22} color="#FFFFFF" />
        <Text style={styles.fabText}>Add New User</Text>
      </Pressable>

      {/* View User Modal */}
      <Modal visible={viewModalVisible} transparent animationType="fade" onRequestClose={() => setViewModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setViewModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.dashboard.cardBg }]} onPress={() => {}}>
            {viewUser && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.dashboard.textPrimary }]}>User Details</Text>
                  <Pressable onPress={() => setViewModalVisible(false)}>
                    <Ionicons name="close" size={22} color={colors.dashboard.textSecondary} />
                  </Pressable>
                </View>

                <View style={styles.viewAvatarWrap}>
                  <View style={[styles.viewAvatar, { backgroundColor: colors.deepGreen + '20' }]}>
                    <Text style={[styles.viewAvatarText, { color: colors.deepGreen }]}>
                      {viewUser.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </Text>
                  </View>
                  <Text style={[styles.viewName, { color: colors.dashboard.textPrimary }]}>{viewUser.name}</Text>
                </View>

                <View style={[styles.viewDivider, { backgroundColor: colors.dashboard.border }]} />

                <View style={styles.viewFieldRow}>
                  <Text style={[styles.viewFieldLabel, { color: colors.dashboard.textSecondary }]}>User ID</Text>
                  <Text style={[styles.viewFieldValue, { color: colors.dashboard.textPrimary }]}>{viewUser.id}</Text>
                </View>
                <View style={styles.viewFieldRow}>
                  <Text style={[styles.viewFieldLabel, { color: colors.dashboard.textSecondary }]}>Role</Text>
                  <View style={[styles.viewBadge, { backgroundColor: colors.blueLight + '20' }]}>
                    <Text style={[styles.viewBadgeText, { color: colors.blueLight }]}>{viewUser.role}</Text>
                  </View>
                </View>
                <View style={styles.viewFieldRow}>
                  <Text style={[styles.viewFieldLabel, { color: colors.dashboard.textSecondary }]}>Location</Text>
                  <Text style={[styles.viewFieldValue, { color: colors.dashboard.textPrimary }]}>{viewUser.location}</Text>
                </View>
                <View style={styles.viewFieldRow}>
                  <Text style={[styles.viewFieldLabel, { color: colors.dashboard.textSecondary }]}>Crop / Specialty</Text>
                  <Text style={[styles.viewFieldValue, { color: colors.dashboard.textPrimary }]}>{viewUser.crop}</Text>
                </View>
                <View style={styles.viewFieldRow}>
                  <Text style={[styles.viewFieldLabel, { color: colors.dashboard.textSecondary }]}>Status</Text>
                  <View
                    style={[
                      styles.viewBadge,
                      {
                        backgroundColor:
                          viewUser.status === 'verified'
                            ? colors.userVerified
                            : viewUser.status === 'pending'
                              ? colors.userPending
                              : colors.userRejected,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.viewBadgeText,
                        {
                          color:
                            viewUser.status === 'verified'
                              ? colors.userVerifiedText
                              : viewUser.status === 'pending'
                                ? colors.userPendingText
                                : colors.userRejectedText,
                        },
                      ]}>
                      {viewUser.status.charAt(0).toUpperCase() + viewUser.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add/Edit User Modal */}
      <Modal visible={formModalVisible} transparent animationType="slide" onRequestClose={() => setFormModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.modalOverlay} onPress={() => setFormModalVisible(false)}>
            <Pressable style={[styles.modalContent, { backgroundColor: colors.dashboard.cardBg }]} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.dashboard.textPrimary }]}>
                  {editingUser ? 'Edit User' : 'Add New User'}
                </Text>
                <Pressable onPress={() => setFormModalVisible(false)}>
                  <Ionicons name="close" size={22} color={colors.dashboard.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                <Text style={[styles.fieldLabel, { color: colors.dashboard.textSecondary }]}>Name</Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    { color: colors.dashboard.textPrimary, backgroundColor: colors.dashboard.bg, borderColor: formErrors.name ? colors.dashboard.redDown : colors.userBorder },
                  ]}
                  placeholder="Enter full name"
                  placeholderTextColor={colors.dashboard.textSecondary}
                  value={formName}
                  onChangeText={(t) => { setFormName(t); setFormErrors((p) => ({ ...p, name: '' })); }}
                />
                {formErrors.name ? <Text style={[styles.fieldError, { color: colors.dashboard.redDown }]}>{formErrors.name}</Text> : null}

                <Text style={[styles.fieldLabel, { color: colors.dashboard.textSecondary }]}>Role</Text>
                {/* Officer provisioning: the backend only supports creating
                    field officers today (bank-officer create requires the
                    parked schema; farmers self-register). The role is fixed
                    rather than picked, so the form cannot promise a role the
                    API will refuse. */}
                <View style={[styles.fieldInput, { backgroundColor: colors.dashboard.bg, borderColor: colors.userBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                  <Text style={{ color: colors.dashboard.textPrimary }}>Field Officer</Text>
                  <Ionicons name="shield-checkmark" size={16} color={colors.deepGreen} />
                </View>

                {!editingUser && (
                  <>
                    <Text style={[styles.fieldLabel, { color: colors.dashboard.textSecondary }]}>NID</Text>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        { color: colors.dashboard.textPrimary, backgroundColor: colors.dashboard.bg, borderColor: formErrors.nid ? colors.dashboard.redDown : colors.userBorder },
                      ]}
                      placeholder="National ID number"
                      placeholderTextColor={colors.dashboard.textSecondary}
                      value={formNid}
                      onChangeText={(t) => { setFormNid(t); setFormErrors((p) => ({ ...p, nid: '' })); }}
                    />
                    {formErrors.nid ? <Text style={[styles.fieldError, { color: colors.dashboard.redDown }]}>{formErrors.nid}</Text> : null}

                    <Text style={[styles.fieldLabel, { color: colors.dashboard.textSecondary }]}>Phone</Text>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        { color: colors.dashboard.textPrimary, backgroundColor: colors.dashboard.bg, borderColor: formErrors.phone ? colors.dashboard.redDown : colors.userBorder },
                      ]}
                      placeholder="e.g. 01712345678"
                      placeholderTextColor={colors.dashboard.textSecondary}
                      value={formPhone}
                      keyboardType="phone-pad"
                      onChangeText={(t) => { setFormPhone(t); setFormErrors((p) => ({ ...p, phone: '' })); }}
                    />
                    {formErrors.phone ? <Text style={[styles.fieldError, { color: colors.dashboard.redDown }]}>{formErrors.phone}</Text> : null}

                    <Text style={[styles.fieldLabel, { color: colors.dashboard.textSecondary }]}>Temporary Password</Text>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        { color: colors.dashboard.textPrimary, backgroundColor: colors.dashboard.bg, borderColor: formErrors.password ? colors.dashboard.redDown : colors.userBorder },
                      ]}
                      placeholder="At least 6 characters"
                      placeholderTextColor={colors.dashboard.textSecondary}
                      value={formPassword}
                      secureTextEntry
                      onChangeText={(t) => { setFormPassword(t); setFormErrors((p) => ({ ...p, password: '' })); }}
                    />
                    {formErrors.password ? <Text style={[styles.fieldError, { color: colors.dashboard.redDown }]}>{formErrors.password}</Text> : null}
                  </>
                )}

                <Text style={[styles.fieldLabel, { color: colors.dashboard.textSecondary }]}>Location</Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    { color: colors.dashboard.textPrimary, backgroundColor: colors.dashboard.bg, borderColor: formErrors.location ? colors.dashboard.redDown : colors.userBorder },
                  ]}
                  placeholder="Enter location"
                  placeholderTextColor={colors.dashboard.textSecondary}
                  value={formLocation}
                  onChangeText={(t) => { setFormLocation(t); setFormErrors((p) => ({ ...p, location: '' })); }}
                />
                {formErrors.location ? <Text style={[styles.fieldError, { color: colors.dashboard.redDown }]}>{formErrors.location}</Text> : null}

                <Text style={[styles.fieldLabel, { color: colors.dashboard.textSecondary }]}>Crop / Specialty</Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    { color: colors.dashboard.textPrimary, backgroundColor: colors.dashboard.bg, borderColor: formErrors.crop ? colors.dashboard.redDown : colors.userBorder },
                  ]}
                  placeholder="Enter crop or specialty"
                  placeholderTextColor={colors.dashboard.textSecondary}
                  value={formCrop}
                  onChangeText={(t) => { setFormCrop(t); setFormErrors((p) => ({ ...p, crop: '' })); }}
                />
                {formErrors.crop ? <Text style={[styles.fieldError, { color: colors.dashboard.redDown }]}>{formErrors.crop}</Text> : null}

                <Pressable
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={[styles.submitBtn, { backgroundColor: colors.deepGreen }, submitting && { opacity: 0.6 }]}>
                  <Text style={styles.submitBtnText}>{submitting ? 'Saving…' : editingUser ? 'Update User' : 'Add User'}</Text>
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
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
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  fabBase: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPressed: {
    opacity: 0.9,
  },
  fabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 20,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  viewAvatarWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  viewAvatarText: {
    fontSize: 22,
    fontWeight: '700',
  },
  viewName: {
    fontSize: 18,
    fontWeight: '700',
  },
  viewDivider: {
    height: 1,
    marginBottom: 16,
  },
  viewFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewFieldLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  viewFieldValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  viewBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  viewBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  formScroll: {
    maxHeight: 500,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  fieldInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  fieldError: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  pickerDropdown: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  pickerOptionText: {
    fontSize: 14,
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
