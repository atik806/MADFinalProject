import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useProfile } from '../../../contexts/ProfileContext';

type TabName = 'home' | 'transactions' | 'loans' | 'profile';

type TabDef = {
  key: TabName;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  label: string;
};

const tabs: TabDef[] = [
  { key: 'home', activeIcon: 'home', inactiveIcon: 'home-outline', label: 'Home' },
  { key: 'transactions', activeIcon: 'repeat', inactiveIcon: 'repeat-outline', label: 'Transactions' },
  { key: 'loans', activeIcon: 'wallet', inactiveIcon: 'wallet-outline', label: 'Loans' },
  { key: 'profile', activeIcon: 'person', inactiveIcon: 'person-outline', label: 'Profile' },
];

export default function ProfileScreen() {
  const { logout } = useAuth();
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState<TabName>('profile');
  const [lang, setLang] = useState<'en' | 'bn'>('en');

  const toggleLang = () => setLang((l) => (l === 'en' ? 'bn' : 'en'));

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (tab === 'profile') return;
    if (tab === 'home') {
      router.push('/view/FarmerDashboard/farmer-dashboard');
      return;
    }
    if (tab === 'transactions') {
      router.push('/view/Transactions/transactions');
      return;
    }
    if (tab === 'loans') {
      router.push('/view/Loans/loans');
      return;
    }
  };

  const handleSignOut = () => {
    logout();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>S</Text>
          </View>
          <Text style={styles.brand}>SOFOL</Text>
        </View>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={toggleLang} hitSlop={8} style={styles.langBtn}>
            <Text style={styles.langText}>{lang === 'en' ? 'বাং' : 'EN'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/view/Notifications/notifications')} hitSlop={8}>
            <Ionicons name="notifications-outline" size={22} color="#555" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroInfo}>
              <Text style={styles.farmerName}>{profile.nameEn}</Text>
              <Text style={styles.farmerId}>Farmer ID: {profile.farmerId}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
              <Text style={styles.verifiedText}>verified</Text>
            </View>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{profile.creditScore}</Text>
              <Text style={styles.heroStatLabel}>Credit Score</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{profile.farmSize} ac</Text>
              <Text style={styles.heroStatLabel}>Farm Size</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{profile.experience} yr</Text>
              <Text style={styles.heroStatLabel}>Experience</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.infoCard}>
          <ProfileRow label="Full Name" value={profile.nameEn} />
          <ProfileRow label="National ID" value={profile.nid} />
          <ProfileRow label="Date of Birth" value={profile.dob} />
          <ProfileRow label="Gender" value={profile.gender} />
          <ProfileRow label="Phone" value={profile.phone} />
          <ProfileRow label="Address" value="" last />
          <AddressLine label="Village" value={profile.village} />
          <AddressLine label="Union" value={profile.union} />
          <AddressLine label="Upazila" value={profile.upazila} />
          <AddressLine label="District" value={profile.district} last />
        </View>

        <Text style={styles.sectionTitle}>Farm Details</Text>
        <View style={styles.infoCard}>
          <ProfileRow label="Land Size" value={`${profile.farmSize} acres`} />
          <ProfileRow label="Ownership" value={profile.ownership} />
          <ProfileRow label="Primary Crop" value={profile.primaryCrop} />
          <ProfileRow label="Secondary Crop" value={profile.secondaryCrop} />
          <ProfileRow label="Crop Diversity" value={profile.cropDiversity} last />
        </View>

        <Text style={styles.sectionTitle}>Documents</Text>
        <View style={styles.infoCard}>
          <DocRow label="National ID Card" uploaded={!!profile.nidPhoto} />
          <DocRow label="Land Records" uploaded={!!profile.landPhoto} />
          <DocRow label="Farm Photographs" uploaded={false} last />
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.signOutText}>Sign Out / Switch Role</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottomNav}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.navItem}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.6}
            >
              <View style={[styles.navIconWrap, isActive && styles.navIconWrapActive]}>
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.inactiveIcon}
                  size={22}
                  color={isActive ? '#fff' : '#9CA3AF'}
                />
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function ProfileRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.profileRow, last && styles.profileRowLast]}>
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
    </View>
  );
}

function AddressLine({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.addressRow, last && styles.profileRowLast]}>
      <Text style={styles.addressLabel}>{label}</Text>
      <Text style={styles.addressValue}>{value}</Text>
    </View>
  );
}

function DocRow({ label, uploaded, last }: { label: string; uploaded: boolean; last?: boolean }) {
  return (
    <View style={[styles.docRow, last && styles.profileRowLast]}>
      <Text style={styles.docLabel}>{label}</Text>
      <View style={[styles.docStatus, uploaded && styles.docStatusUploaded]}>
        <Text style={[styles.docStatusText, uploaded && styles.docStatusTextUploaded]}>
          {uploaded ? 'Uploaded' : 'Upload'}
        </Text>
        {uploaded && <Ionicons name="checkmark-circle" size={14} color="#16A34A" style={{ marginLeft: 4 }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F8',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006847',
  },
  logo: {
    width: 32,
    height: 32,
    backgroundColor: '#006847',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  brand: {
    marginLeft: 8,
    fontWeight: '700',
    fontSize: 16,
    color: '#006847',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  heroCard: {
    backgroundColor: '#006847',
    borderRadius: 20,
    padding: 22,
    marginTop: 18,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroInfo: {
    flex: 1,
  },
  farmerName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  farmerId: {
    color: '#BBF7D0',
    fontSize: 13,
    marginTop: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  verifiedText: {
    color: '#BBF7D0',
    fontSize: 12,
    fontWeight: '600',
  },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: '#1B7A60',
    borderRadius: 16,
    marginTop: 18,
    paddingVertical: 16,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: '#FFFFFF20',
  },
  heroStatValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  heroStatLabel: {
    color: '#9FE0B0',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 10,
  },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  profileRowLast: {
    borderBottomWidth: 0,
  },
  profileLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  profileValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '55%',
  },

  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 42,
    paddingRight: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  addressLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  addressValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
  },

  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  docLabel: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  docStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  docStatusUploaded: {
    backgroundColor: '#ECFDF5',
  },
  docStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  docStatusTextUploaded: {
    color: '#16A34A',
  },

  signOutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 28,
    gap: 8,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },

  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 6,
    paddingBottom: 12,
    paddingHorizontal: 8,
    boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  navIconWrap: {
    width: 40,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIconWrapActive: {
    backgroundColor: '#006847',
  },
  navLabel: {
    fontSize: 11,
    marginTop: 4,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#006847',
    fontWeight: '700',
  },
});
