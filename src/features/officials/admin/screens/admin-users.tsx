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
import { initialUsers, ADMIN_USER_TABS, ROLES } from '@/data';

type User = {
  id: string;
  name: string;
  role: 'Farmer' | 'Field Officer' | 'Bank Officer';
  location: string;
  crop: string;
  status: 'verified' | 'pending' | 'rejected';
};

const TABS = ADMIN_USER_TABS;
type Tab = (typeof TABS)[number];

const ROLE_MAP: Record<Tab, User['role']> = {
  Farmers: 'Farmer',
  'Field Officers': 'Field Officer',
  'Bank Officers': 'Bank Officer',
};



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
  const [users, setUsers] = useState<User[]>(initialUsers);

  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewUser, setViewUser] = useState<User | null>(null);

  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<User['role']>('Farmer');
  const [formLocation, setFormLocation] = useState('');
  const [formCrop, setFormCrop] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [rolePickerVisible, setRolePickerVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filtered = users.filter((u) => {
    const roleMatch = u.role === ROLE_MAP[activeTab];
    const searchMatch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.location.toLowerCase().includes(search.toLowerCase()) ||
      u.crop.toLowerCase().includes(search.toLowerCase());
    return roleMatch && searchMatch;
  });

  const totalByTab = (tab: Tab) => users.filter((u) => u.role === ROLE_MAP[tab]).length;

  const openViewModal = (user: User) => {
    setViewUser(user);
    setViewModalVisible(true);
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormRole('Farmer');
    setFormLocation('');
    setFormCrop('');
    setFormErrors({});
    setFormModalVisible(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormRole(user.role);
    setFormLocation(user.location);
    setFormCrop(user.crop);
    setFormErrors({});
    setFormModalVisible(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = 'Name is required';
    if (!formLocation.trim()) errors.location = 'Location is required';
    if (!formCrop.trim()) errors.crop = 'Crop is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    if (editingUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, name: formName.trim(), role: formRole, location: formLocation.trim(), crop: formCrop.trim() }
            : u,
        ),
      );
      setFormModalVisible(false);
      Alert.alert('Success', `${formName.trim()} has been updated.`);
    } else {
      const newId = `U${String(users.length + 1).padStart(3, '0')}`;
      const newUser: User = {
        id: newId,
        name: formName.trim(),
        role: formRole,
        location: formLocation.trim(),
        crop: formCrop.trim(),
        status: 'pending',
      };
      setUsers((prev) => [...prev, newUser]);
      setFormModalVisible(false);
      Alert.alert('Success', `${formName.trim()} has been added successfully.`);
    }
  };

  const handleDeactivate = (user: User) => {
    Alert.alert(
      'Deactivate User',
      `Are you sure? This action can be reversed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: () => {
            setUsers((prev) =>
              prev.map((u) => (u.id === user.id ? { ...u, status: 'rejected' as const } : u)),
            );
            Alert.alert('Done', `${user.name} has been deactivated.`);
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
                <Pressable
                  onPress={() => setRolePickerVisible(!rolePickerVisible)}
                  style={[styles.fieldInput, { backgroundColor: colors.dashboard.bg, borderColor: colors.userBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                  <Text style={{ color: colors.dashboard.textPrimary }}>{formRole}</Text>
                  <Ionicons name={rolePickerVisible ? 'chevron-up' : 'chevron-down'} size={18} color={colors.dashboard.textSecondary} />
                </Pressable>
                {rolePickerVisible && (
                  <View style={[styles.pickerDropdown, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.userBorder }]}>
                    {ROLES.map((r) => (
                      <Pressable
                        key={r}
                        onPress={() => { setFormRole(r); setRolePickerVisible(false); }}
                        style={[styles.pickerOption, { borderBottomColor: colors.userBorder }, r === formRole && { backgroundColor: colors.deepGreen + '15' }]}>
                        <Text style={[styles.pickerOptionText, { color: colors.dashboard.textPrimary }, r === formRole && { color: colors.deepGreen, fontWeight: '700' }]}>{r}</Text>
                        {r === formRole && <Ionicons name="checkmark" size={18} color={colors.deepGreen} />}
                      </Pressable>
                    ))}
                  </View>
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
                  style={[styles.submitBtn, { backgroundColor: colors.deepGreen }]}>
                  <Text style={styles.submitBtnText}>{editingUser ? 'Update User' : 'Add User'}</Text>
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
