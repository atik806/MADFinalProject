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
import { Ionicons, Feather } from '@expo/vector-icons';
import { useLoans, type LoanApplication, type ActiveLoan } from '../../../contexts/LoanContext';

type TabName = 'home' | 'transactions' | 'loans' | 'profile';
type LoansTab = 'active' | 'applications';

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

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#D97706', bg: '#FFFBEB' },
  under_review: { label: 'Under Review', color: '#2563EB', bg: '#EFF6FF' },
  approved: { label: 'Approved', color: '#16A34A', bg: '#ECFDF5' },
  rejected: { label: 'Rejected', color: '#DC2626', bg: '#FEF2F2' },
};

export default function LoansScreen() {
  const { applications, activeLoans } = useLoans();
  const [activeTab, setActiveTab] = useState<TabName>('loans');
  const [loansTab, setLoansTab] = useState<LoansTab>('active');
  const [lang, setLang] = useState<'en' | 'bn'>('en');

  const toggleLang = () => setLang((l) => (l === 'en' ? 'bn' : 'en'));

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (tab === 'loans') return;
    if (tab === 'home') {
      router.push('/view/FarmerDashboard/farmer-dashboard');
      return;
    }
    if (tab === 'transactions') {
      router.push('/view/Transactions/transactions');
      return;
    }
    if (tab === 'profile') {
      router.push('/view/Profile/profile');
      return;
    }
  };

  const totalActiveAmount = activeLoans.reduce((sum, l) => sum + l.amount, 0);
  const totalPendingAmount = applications
    .filter((a) => a.status === 'pending' || a.status === 'under_review')
    .reduce((sum, a) => sum + a.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>S</Text>
          </View>
          <Text style={styles.brand}>SOFOL</Text>
        </View>
        <Text style={styles.headerTitle}>My Loans</Text>
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
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Feather name="briefcase" size={18} color="#16A34A" />
            <Text style={styles.summaryValue}>৳{totalActiveAmount.toLocaleString('en-BD')}</Text>
            <Text style={styles.summaryLabel}>Active Loans</Text>
          </View>
          <View style={styles.summaryCard}>
            <Feather name="clock" size={18} color="#D97706" />
            <Text style={styles.summaryValue}>৳{totalPendingAmount.toLocaleString('en-BD')}</Text>
            <Text style={styles.summaryLabel}>Pending Approval</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.applyBtn}
          onPress={() => router.push('/view/Loans/apply-loan')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.applyBtnText}>Apply for New Loan</Text>
        </TouchableOpacity>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, loansTab === 'active' && styles.tabBtnActive]}
            onPress={() => setLoansTab('active')}
          >
            <Text style={[styles.tabText, loansTab === 'active' && styles.tabTextActive]}>
              My Loans {activeLoans.length > 0 && `(${activeLoans.length})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, loansTab === 'applications' && styles.tabBtnActive]}
            onPress={() => setLoansTab('applications')}
          >
            <Text style={[styles.tabText, loansTab === 'applications' && styles.tabTextActive]}>
              My Loan Applications {applications.length > 0 && `(${applications.length})`}
            </Text>
          </TouchableOpacity>
        </View>

        {loansTab === 'active' ? (
          activeLoans.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="briefcase" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No active loans</Text>
              <Text style={styles.emptySub}>Apply for a loan to get started</Text>
            </View>
          ) : (
            activeLoans.map((loan) => (
              <ActiveLoanCard key={loan.id} loan={loan} />
            ))
          )
        ) : (
          applications.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="file-text" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No applications yet</Text>
              <Text style={styles.emptySub}>Apply for your first loan</Text>
            </View>
          ) : (
            applications.map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))
          )
        )}
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

function ActiveLoanCard({ loan }: { loan: ActiveLoan }) {
  return (
    <View style={styles.loanCard}>
      <View style={styles.loanTop}>
        <View style={styles.loanTitleRow}>
          <View style={styles.loanIcon}>
            <Feather name="droplet" size={18} color="#006847" />
          </View>
          <View>
            <Text style={styles.loanTitle}>{loan.title}</Text>
            <Text style={styles.loanRef}>{loan.id} · Approved {loan.date}</Text>
          </View>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ACTIVE</Text>
        </View>
      </View>

      <View style={styles.loanDivider} />

      <View style={styles.loanDetails}>
        <InfoItem title="Loan Amount" value={`৳${loan.amount.toLocaleString('en-BD')}`} />
        <InfoItem title="Interest" value={loan.interest} />
        <InfoItem title="Duration" value={loan.duration} />
        <InfoItem title="Monthly EMI" value={`৳${loan.emi.toLocaleString('en-BD')}`} />
      </View>

      <View style={styles.loanDivider} />

      <View style={styles.nextPayment}>
        <View>
          <Text style={styles.nextLabel}>Next Payment Due</Text>
          <Text style={styles.nextDate}>{loan.nextPaymentDate}</Text>
        </View>
        <View style={styles.nextAmountWrap}>
          <Text style={styles.nextAmount}>৳{loan.nextPaymentAmount.toLocaleString('en-BD')}</Text>
          <Text style={styles.nextSub}>EMI</Text>
        </View>
      </View>

      <View style={styles.loanDivider} />

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Repayment Progress</Text>
          <Text style={styles.progressPercent}>{loan.progress}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${loan.progress}%` }]} />
        </View>
        <View style={styles.progressMeta}>
          <Text style={styles.installments}>
            {loan.installmentsPaid} of {loan.installmentsTotal} installments paid
          </Text>
          <Text style={styles.remaining}>
            {loan.installmentsTotal - loan.installmentsPaid} remaining
          </Text>
        </View>
      </View>
    </View>
  );
}

function ApplicationCard({ app }: { app: LoanApplication }) {
  const status = statusConfig[app.status] || statusConfig.pending;
  return (
    <TouchableOpacity
      style={styles.appCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/view/Loans/application-detail?id=${app.id}`)}
    >
      <View style={styles.appTop}>
        <View style={styles.appInfo}>
          <Text style={styles.appTitle}>{app.title}</Text>
          <Text style={styles.appRef}>{app.id} · {app.date}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.appDivider} />

      <View style={styles.appBottom}>
        <View style={styles.appDetail}>
          <Text style={styles.appDetailLabel}>Amount</Text>
          <Text style={styles.appDetailValue}>৳{app.amount.toLocaleString('en-BD')}</Text>
        </View>
        <View style={styles.appDetail}>
          <Text style={styles.appDetailLabel}>Duration</Text>
          <Text style={styles.appDetailValue}>{app.duration}</Text>
        </View>
        <View style={styles.appDetail}>
          <Text style={styles.appDetailLabel}>Type</Text>
          <Text style={styles.appDetailValue}>{app.installmentType === 'monthly' ? 'Monthly' : 'Seasonal'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function InfoItem({ title, value }: { title: string; value: string }) {
  return (
    <View>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    gap: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  applyBtn: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#006847',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabBtnActive: {
    backgroundColor: '#006847',
    borderColor: '#006847',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#fff',
  },
  loanCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  loanTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  loanTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loanIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loanTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  loanRef: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  loanDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },
  loanDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoTitle: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '500',
  },
  infoValue: {
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 4,
    fontSize: 14,
  },
  nextPayment: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
  nextDate: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  nextAmountWrap: {
    alignItems: 'flex-end',
  },
  nextAmount: {
    color: '#006847',
    fontSize: 18,
    fontWeight: '700',
  },
  nextSub: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 1,
  },
  progressSection: {},
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#006847',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: 10,
    backgroundColor: '#22C55E',
    borderRadius: 10,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  installments: {
    color: '#6B7280',
    fontSize: 12,
  },
  remaining: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  appCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  appTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appInfo: {
    flex: 1,
    marginRight: 10,
  },
  appTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  appRef: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  appDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  appBottom: {
    gap: 8,
  },
  appDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appDetailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  appDetailValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
    maxWidth: '55%',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#D1D5DB',
    marginTop: 4,
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
