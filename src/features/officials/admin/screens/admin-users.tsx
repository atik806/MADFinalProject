import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { BrandColors } from '@/features/officials/shared/constants/theme';
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

  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.top}>
        <Animated.View style={[skeletonStyles.avatar, { opacity }]} />
        <View style={skeletonStyles.lines}>
          <Animated.View style={[skeletonStyles.line, { width: '60%', opacity }]} />
          <Animated.View style={[skeletonStyles.line, { width: '40%', opacity }]} />
        </View>
      </View>
      <View style={skeletonStyles.actions}>
        <Animated.View style={[skeletonStyles.action, { opacity }]} />
        <Animated.View style={[skeletonStyles.action, { opacity }]} />
        <Animated.View style={[skeletonStyles.action, { opacity }]} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.dashboard.cardBg,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BrandColors.userBorder,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BrandColors.userBorder,
  },
  lines: {
    flex: 1,
    gap: 8,
  },
  line: {
    height: 14,
    borderRadius: 7,
    backgroundColor: BrandColors.userBorder,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  action: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    backgroundColor: BrandColors.userBorder,
  },
});

export default function AdminUsersScreen() {
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
    <View style={styles.screen}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BrandColors.deepGreen} colors={[BrandColors.deepGreen]} />}>
        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
              <View style={[styles.tabCount, activeTab === tab && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, activeTab === tab && styles.tabCountTextActive]}>
                  {totalByTab(tab)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color={BrandColors.dashboard.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, location or crop..."
            placeholderTextColor={BrandColors.dashboard.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={BrandColors.dashboard.textSecondary} />
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
            <View style={styles.emptyIconWrap}>
              <Ionicons name="people-outline" size={48} color={BrandColors.userBorder} />
            </View>
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptySubtitle}>
              {search ? 'Try adjusting your search query' : `No ${activeTab.toLowerCase()} registered yet`}
            </Text>
          </View>
        ) : (
          filtered.map((user) => (
            <UserCard key={user.id} user={user} />
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <Pressable style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
        <Ionicons name="add" size={22} color="#FFFFFF" />
        <Text style={styles.fabText}>Add New User</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.userBg,
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
    backgroundColor: BrandColors.dashboard.cardBg,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: BrandColors.userBorder,
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
  tabActive: {
    backgroundColor: BrandColors.deepGreen,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.dashboard.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BrandColors.userBg,
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
    color: BrandColors.dashboard.textSecondary,
  },
  tabCountTextActive: {
    color: '#FFFFFF',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.dashboard.cardBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: BrandColors.userBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: BrandColors.dashboard.textPrimary,
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
    backgroundColor: BrandColors.dashboard.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BrandColors.userBorder,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.dashboard.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: BrandColors.dashboard.textSecondary,
    textAlign: 'center',
  },
  fab: {
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
    backgroundColor: BrandColors.deepGreen,
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: BrandColors.deepGreen,
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
