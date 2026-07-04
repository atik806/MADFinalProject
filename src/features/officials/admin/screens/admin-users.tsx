import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
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

type User = {
  id: string;
  name: string;
  role: 'Farmer' | 'Field Officer' | 'Bank Officer';
  location: string;
  crop: string;
  status: 'verified' | 'pending' | 'rejected';
};

const MOCK_USERS: User[] = [
  { id: 'U001', name: 'Mohammad Rahim', role: 'Farmer', location: 'Bhola', crop: 'Rice', status: 'verified' },
  { id: 'U002', name: 'Farida Begum', role: 'Farmer', location: 'Noakhali', crop: 'Shrimp', status: 'pending' },
  { id: 'U003', name: 'Karim Ali', role: 'Farmer', location: 'Sirajganj', crop: 'Jute', status: 'rejected' },
  { id: 'U004', name: 'Nasima Khatun', role: 'Farmer', location: 'Faridpur', crop: 'Vegetables', status: 'verified' },
  { id: 'U005', name: 'Jamal Uddin', role: 'Farmer', location: 'Sylhet', crop: 'Tea', status: 'pending' },
  { id: 'U006', name: 'Shamim Reza', role: 'Field Officer', location: 'Dhaka', crop: 'Field Operations', status: 'verified' },
  { id: 'U007', name: 'Ayesha Khatun', role: 'Bank Officer', location: 'Chittagong', crop: 'Credit & Loans', status: 'verified' },
  { id: 'U008', name: 'Rafiq Hasan', role: 'Field Officer', location: 'Rajshahi', crop: 'Field Operations', status: 'pending' },
  { id: 'U009', name: 'Sultana Khan', role: 'Bank Officer', location: 'Mymensingh', crop: 'Credit & Loans', status: 'rejected' },
  { id: 'U010', name: 'Delwar Hossain', role: 'Farmer', location: 'Khulna', crop: 'Jute', status: 'verified' },
  { id: 'U011', name: 'Shahida Parvin', role: 'Farmer', location: 'Bogra', crop: 'Potato', status: 'verified' },
  { id: 'U012', name: 'Abdur Rahman', role: 'Field Officer', location: 'Barisal', crop: 'Field Operations', status: 'rejected' },
];

const TABS = ['Farmers', 'Field Officers', 'Bank Officers'] as const;
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

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filtered = MOCK_USERS.filter((u) => {
    const roleMatch = u.role === ROLE_MAP[activeTab];
    const searchMatch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.location.toLowerCase().includes(search.toLowerCase()) ||
      u.crop.toLowerCase().includes(search.toLowerCase());
    return roleMatch && searchMatch;
  });

  const totalByTab = (tab: Tab) => MOCK_USERS.filter((u) => u.role === ROLE_MAP[tab]).length;

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
              onView={(u) => Alert.alert(u.name, `ID: ${u.id}\nRole: ${u.role}\nLocation: ${u.location}\nCrop: ${u.crop}\nStatus: ${u.status}`)}
              onEdit={(u) => Alert.alert('Edit User', `Edit functionality for ${u.name} coming soon.`)}
              onDeactivate={(u) => {
                Alert.alert(
                  'Deactivate User',
                  `Are you sure you want to deactivate ${u.name}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Deactivate', style: 'destructive', onPress: () => Alert.alert('Done', `${u.name} has been deactivated.`) },
                  ],
                );
              }}
            />
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <Pressable
        onPress={() => Alert.alert('Add New User', 'User creation form coming soon.')}
        style={({ pressed }) => [{ backgroundColor: colors.deepGreen, ...styles.fabBase }, pressed && styles.fabPressed]}>
        <Ionicons name="add" size={22} color="#FFFFFF" />
        <Text style={styles.fabText}>Add New User</Text>
      </Pressable>
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
});
