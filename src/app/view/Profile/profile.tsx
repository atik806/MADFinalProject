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
import { useTranslation } from '../../../hooks/use-translation';
import { useColors } from '../../../features/officials/shared/constants/theme';

type TabName = 'home' | 'transactions' | 'loans' | 'profile';

type TabDef = {
  key: TabName;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
};

export default function ProfileScreen() {
  const colors = useColors();
  const { logout } = useAuth();
  const { profile } = useProfile();
  const { t, lang, toggleLang } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabName>('profile');

  const tabs: TabDef[] = [
    { key: 'home', activeIcon: 'home', inactiveIcon: 'home-outline', labelKey: 'home' },
    { key: 'transactions', activeIcon: 'repeat', inactiveIcon: 'repeat-outline', labelKey: 'transactionsTab' },
    { key: 'loans', activeIcon: 'wallet', inactiveIcon: 'wallet-outline', labelKey: 'loansTab' },
    { key: 'profile', activeIcon: 'person', inactiveIcon: 'person-outline', labelKey: 'profileTab' },
  ];

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.dashboard.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.dashboard.cardBg, borderBottomColor: colors.dashboard.border }]}>
        <View style={styles.logoContainer}>
          <View style={[styles.logo, { backgroundColor: colors.deepGreen }]}>
            <Ionicons name="leaf" size={20} color="#fff" />
          </View>
        </View>
        <Text style={[styles.headerTitle, { color: colors.dashboard.textPrimary }]}>{t('myProfileTitle')}</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={toggleLang} hitSlop={8} style={[styles.langBtn, { backgroundColor: colors.userVerified }]}>
            <Text style={[styles.langText, { color: colors.userVerifiedText }]}>{lang === 'en' ? 'বাং' : 'EN'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/view/Notifications/notifications')} hitSlop={8}>
            <Ionicons name="notifications-outline" size={22} color={colors.dashboard.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.heroCard, { backgroundColor: colors.deepGreen }]}>
          <View style={styles.heroTop}>
            <View style={styles.heroInfo}>
              <Text style={styles.farmerName}>{lang === 'bn' && profile.nameBn ? profile.nameBn : profile.nameEn}</Text>
              <Text style={styles.farmerId}>{t('farmerId')}: {profile.farmerId}</Text>
            </View>
            <View style={[styles.verifiedBadge, { backgroundColor: '#22C55E20' }]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.dashboard.greenUp} />
              <Text style={styles.verifiedText}>{t('verified')}</Text>
            </View>
          </View>

          <View style={[styles.heroStats, { backgroundColor: colors.userVerifiedText }]}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{profile.creditScore}</Text>
              <Text style={styles.heroStatLabel}>{t('creditScoreLabel')}</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: '#FFFFFF20' }]} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{profile.farmSize} {t('ac')}</Text>
              <Text style={styles.heroStatLabel}>{t('farmSize')}</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: '#FFFFFF20' }]} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{profile.experience} {t('yr')}</Text>
              <Text style={styles.heroStatLabel}>{t('experience')}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.deepGreen }]} onPress={() => router.push('/view/Profile/edit-profile')}>
          <Ionicons name="pencil" size={16} color="#fff" />
          <Text style={styles.editBtnText}>{t('editProfile')}</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.dashboard.textPrimary }]}>{t('personalInfo')}</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.dashboard.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 }]}>
          <ProfileRow label={t('fullName')} value={lang === 'bn' && profile.nameBn ? profile.nameBn : profile.nameEn} colors={colors} />
          <ProfileRow label={t('nationalId')} value={profile.nid} colors={colors} />
          <ProfileRow label={t('dateOfBirth')} value={profile.dob} colors={colors} />
          <ProfileRow label={t('gender')} value={profile.gender} colors={colors} />
          <ProfileRow label={t('phone')} value={profile.phone} colors={colors} />
          <ProfileRow label={t('address')} value="" last colors={colors} />
          <AddressLine label={t('village')} value={profile.village} colors={colors} />
          <AddressLine label={t('union')} value={profile.union} colors={colors} />
          <AddressLine label={t('upazila')} value={profile.upazila} colors={colors} />
          <AddressLine label={t('district')} value={profile.district} last colors={colors} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.dashboard.textPrimary }]}>{t('farmDetails')}</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.dashboard.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 }]}>
          <ProfileRow label={t('landSize')} value={`${profile.farmSize} ${t('acres')}`} colors={colors} />
          <ProfileRow label={t('ownership')} value={profile.ownership} colors={colors} />
          <ProfileRow label={t('primaryCrop')} value={profile.primaryCrop} colors={colors} />
          <ProfileRow label={t('secondaryCrop')} value={profile.secondaryCrop} colors={colors} />
          <ProfileRow label={t('cropDiversity')} value={profile.cropDiversity} last colors={colors} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.dashboard.textPrimary }]}>{t('documentsTitle')}</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.dashboard.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 }]}>
          <DocRow label={t('nidCard')} uploaded={!!profile.nidPhoto} colors={colors} />
          <DocRow label={t('landRecords')} uploaded={!!profile.landPhoto} colors={colors} />
          <DocRow label={t('farmPhotographs')} uploaded={false} last colors={colors} />
        </View>

        <TouchableOpacity style={[styles.signOutBtn, { backgroundColor: colors.userRejected, borderColor: '#FECACA' }]} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={colors.dashboard.redDown} />
          <Text style={[styles.signOutText, { color: colors.dashboard.redDown }]}>{t('signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.bottomNav, { backgroundColor: colors.dashboard.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }]}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.navItem}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.6}
            >
              <View style={[styles.navIconWrap, isActive && { backgroundColor: colors.deepGreen }]}>
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.inactiveIcon}
                  size={22}
                  color={isActive ? '#fff' : colors.dashboard.textSecondary}
                />
              </View>
              <Text style={[styles.navLabel, { color: isActive ? colors.deepGreen : colors.dashboard.textSecondary }, isActive && { fontWeight: '700' }]}>
                {t(tab.labelKey as any)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function ProfileRow({ label, value, last, colors }: { label: string; value: string; last?: boolean; colors: any }) {
  return (
    <View style={[styles.profileRow, last && styles.profileRowLast, { borderBottomColor: colors.dashboard.border }]}>
      <Text style={[styles.profileLabel, { color: colors.dashboard.textSecondary }]}>{label}</Text>
      <Text style={[styles.profileValue, { color: colors.dashboard.textPrimary }]}>{value}</Text>
    </View>
  );
}

function AddressLine({ label, value, last, colors }: { label: string; value: string; last?: boolean; colors: any }) {
  return (
    <View style={[styles.addressRow, last && styles.profileRowLast, { borderBottomColor: colors.dashboard.border }]}>
      <Text style={[styles.addressLabel, { color: colors.dashboard.textSecondary }]}>{label}</Text>
      <Text style={[styles.addressValue, { color: colors.dashboard.textPrimary }]}>{value}</Text>
    </View>
  );
}

function DocRow({ label, uploaded, last, colors }: { label: string; uploaded: boolean; last?: boolean; colors: any }) {
  return (
    <View style={[styles.docRow, last && styles.profileRowLast, { borderBottomColor: colors.dashboard.border }]}>
      <Text style={[styles.docLabel, { color: colors.dashboard.textPrimary }]}>{label}</Text>
      <View style={[styles.docStatus, { backgroundColor: colors.dashboard.border }, uploaded && { backgroundColor: colors.userVerified }]}>
        <Text style={[styles.docStatusText, { color: colors.dashboard.textSecondary }, uploaded && { color: colors.dashboard.greenUp }]}>
          {uploaded ? 'Uploaded' : 'Upload'}
        </Text>
        {uploaded && <Ionicons name="checkmark-circle" size={14} color={colors.dashboard.greenUp} style={{ marginLeft: 4 }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderBottomWidth: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroCard: {
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
  editBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 44,
    borderRadius: 14,
    marginTop: 16,
    gap: 6,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 10,
  },
  infoCard: {
    borderRadius: 18,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  profileRowLast: {
    borderBottomWidth: 0,
  },
  profileLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  profileValue: {
    fontSize: 14,
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
  },
  addressLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  addressValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  docLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  docStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  docStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  signOutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 28,
    gap: 8,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 12,
    paddingHorizontal: 8,
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
  navLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});
