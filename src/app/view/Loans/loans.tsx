import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useLoans, type LoanApplication, type ActiveLoan } from '../../../contexts/LoanContext';
import { useTranslation } from '../../../hooks/use-translation';
import { useColors } from '../../../features/officials/shared/constants/theme';
import { ErrorState, LoadingState } from '../../../components/screen-status';
import { statusConfig } from '@/data';

// react-native-web's Alert.alert is a no-op, so a repay error/success notice
// would silently vanish in a browser. Fall back to window.alert on web.
// window.alert() freezes rendering the instant it's called, so calling it
// synchronously right after a setState (e.g. right after a repay updates
// progress) can show the alert BEFORE the browser paints that update —
// looking like nothing happened until the alert is dismissed. Deferring one
// frame lets the paint land first.
function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') requestAnimationFrame(() => window.alert(message));
    return;
  }
  Alert.alert(title, message);
}

type TabName = 'home' | 'transactions' | 'loans' | 'profile';
type LoansTab = 'active' | 'applications';

type TabDef = {
  key: TabName;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
};

export default function LoansScreen() {
  const colors = useColors();
  const { applications, activeLoans, loading, error, reload, repayLoan } = useLoans();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabName>('loans');
  const [loansTab, setLoansTab] = useState<LoansTab>('active');
  const [payingId, setPayingId] = useState<string | null>(null);

  const handleRepay = async (loan: ActiveLoan) => {
    if (payingId) return;
    setPayingId(loan.id);
    try {
      await repayLoan(loan.id);
      notify('Payment Recorded', `Your EMI payment of ৳${loan.nextPaymentAmount.toLocaleString('en-BD')} was recorded.`);
    } catch (e: any) {
      notify('Payment Failed', e?.message ?? 'Could not record the payment.');
    } finally {
      setPayingId(null);
    }
  };

  const tabs: TabDef[] = [
    { key: 'home', activeIcon: 'home', inactiveIcon: 'home-outline', labelKey: 'home' },
    { key: 'transactions', activeIcon: 'repeat', inactiveIcon: 'repeat-outline', labelKey: 'transactionsTab' },
    { key: 'loans', activeIcon: 'wallet', inactiveIcon: 'wallet-outline', labelKey: 'loansTab' },
    { key: 'profile', activeIcon: 'person', inactiveIcon: 'person-outline', labelKey: 'profileTab' },
  ];

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

  const noData = applications.length === 0 && activeLoans.length === 0;

  const totalActiveAmount = activeLoans.reduce((sum, l) => sum + l.amount, 0);
  const totalPendingAmount = applications
    .filter((a) => a.status === 'pending' || a.status === 'under_review')
    .reduce((sum, a) => sum + a.amount, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.dashboard.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.dashboard.cardBg, borderBottomColor: colors.dashboard.border }]}>
        <View style={styles.logoContainer}>
          <View style={[styles.logo, { backgroundColor: colors.deepGreen }]}>
            <Ionicons name="leaf" size={20} color="#fff" />
          </View>
        </View>
        <Text style={[styles.headerTitle, { color: colors.dashboard.textPrimary }]}>{t('myLoans')}</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={() => reload()}
            disabled={loading}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('refresh')}
            accessibilityState={{ disabled: loading, busy: loading }}>
            <Ionicons name="refresh" size={22} color={colors.dashboard.textSecondary} style={loading ? { opacity: 0.4 } : undefined} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/view/Notifications/notifications')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('notifications')}>
            <Ionicons name="notifications-outline" size={22} color={colors.dashboard.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {noData && loading ? (
          <LoadingState />
        ) : noData && error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
        <>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.dashboard.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 }]}>
            <Feather name="briefcase" size={18} color={colors.dashboard.greenUp} />
            <Text style={[styles.summaryValue, { color: colors.dashboard.textPrimary }]}>৳{totalActiveAmount.toLocaleString('en-BD')}</Text>
            <Text style={[styles.summaryLabel, { color: colors.dashboard.textSecondary }]}>{t('activeLoans')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.dashboard.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 }]}>
            <Feather name="clock" size={18} color="#D97706" />
            <Text style={[styles.summaryValue, { color: colors.dashboard.textPrimary }]}>৳{totalPendingAmount.toLocaleString('en-BD')}</Text>
            <Text style={[styles.summaryLabel, { color: colors.dashboard.textSecondary }]}>{t('pendingApproval')}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.applyBtn, { backgroundColor: colors.deepGreen }]}
          onPress={() => router.push('/view/Loans/apply-loan')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('applyForNewLoan')}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.applyBtnText}>{t('applyForNewLoan')}</Text>
        </TouchableOpacity>

        <View style={styles.tabRow}>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: loansTab === 'active' }}
            accessibilityLabel={t('myLoansTab')}
            style={[styles.tabBtn, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }, loansTab === 'active' && { backgroundColor: colors.deepGreen, borderColor: colors.deepGreen }]}
            onPress={() => setLoansTab('active')}
          >
            <Text style={[styles.tabText, { color: colors.dashboard.textSecondary }, loansTab === 'active' && { color: '#fff' }]}>
              {t('myLoansTab')} {activeLoans.length > 0 && `(${activeLoans.length})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: loansTab === 'applications' }}
            accessibilityLabel={t('myApplications')}
            style={[styles.tabBtn, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }, loansTab === 'applications' && { backgroundColor: colors.deepGreen, borderColor: colors.deepGreen }]}
            onPress={() => setLoansTab('applications')}
          >
            <Text style={[styles.tabText, { color: colors.dashboard.textSecondary }, loansTab === 'applications' && { color: '#fff' }]}>
              {t('myApplications')} {applications.length > 0 && `(${applications.length})`}
            </Text>
          </TouchableOpacity>
        </View>

        {loansTab === 'active' ? (
          activeLoans.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="briefcase" size={40} color={colors.dashboard.border} />
              <Text style={[styles.emptyText, { color: colors.dashboard.textSecondary }]}>{t('noActiveLoans')}</Text>
              <Text style={[styles.emptySub, { color: colors.dashboard.border }]}>{t('applyFirst')}</Text>
            </View>
          ) : (
            activeLoans.map((loan) => (
              <ActiveLoanCard
                key={loan.id}
                loan={loan}
                t={t}
                colors={colors}
                onRepay={() => handleRepay(loan)}
                paying={payingId === loan.id}
              />
            ))
          )
        ) : (
          applications.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="file-text" size={40} color={colors.dashboard.border} />
              <Text style={[styles.emptyText, { color: colors.dashboard.textSecondary }]}>{t('noApplications')}</Text>
              <Text style={[styles.emptySub, { color: colors.dashboard.border }]}>{t('applyFirst')}</Text>
            </View>
          ) : (
            applications.map((app) => (
              <ApplicationCard key={app.id} app={app} t={t} colors={colors} />
            ))
          )
        )}
        </>
        )}
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
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={t(tab.labelKey as any)}
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

function ActiveLoanCard({
  loan,
  t,
  colors,
  onRepay,
  paying,
}: {
  loan: ActiveLoan;
  t: (key: any) => string;
  colors: any;
  onRepay: () => void;
  paying: boolean;
}) {
  return (
    <View style={[styles.loanCard, { backgroundColor: colors.dashboard.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 }]}>
      <View style={styles.loanTop}>
        <View style={styles.loanTitleRow}>
          <View style={[styles.loanIcon, { backgroundColor: colors.userVerified }]}>
            <Feather name="droplet" size={18} color={colors.deepGreen} />
          </View>
          <View>
            <Text style={[styles.loanTitle, { color: colors.dashboard.textPrimary }]}>{loan.title}</Text>
            <Text style={[styles.loanRef, { color: colors.dashboard.textSecondary }]}>{loan.id} · {t('approved')} {loan.date}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
          <Text style={[styles.badgeText, { color: '#2563EB' }]}>{t('active')}</Text>
        </View>
      </View>

      <View style={[styles.loanDivider, { backgroundColor: colors.dashboard.border }]} />

      <View style={styles.loanDetails}>
        <InfoItem title={t('loanAmount')} value={`৳${loan.amount.toLocaleString('en-BD')}`} colors={colors} />
        <InfoItem title={t('interest')} value={loan.interest} colors={colors} />
        <InfoItem title={t('duration')} value={loan.duration} colors={colors} />
        <InfoItem title={t('monthlyEMI')} value={`৳${loan.emi.toLocaleString('en-BD')}`} colors={colors} />
      </View>

      <View style={[styles.loanDivider, { backgroundColor: colors.dashboard.border }]} />

      <View style={styles.nextPayment}>
        <View>
          <Text style={[styles.nextLabel, { color: colors.dashboard.textSecondary }]}>{t('nextPaymentDue')}</Text>
          <Text style={[styles.nextDate, { color: colors.dashboard.textPrimary }]}>{loan.nextPaymentDate}</Text>
        </View>
        <View style={styles.nextAmountWrap}>
          <Text style={[styles.nextAmount, { color: colors.deepGreen }]}>৳{loan.nextPaymentAmount.toLocaleString('en-BD')}</Text>
          <Text style={[styles.nextSub, { color: colors.dashboard.textSecondary }]}>{t('emi')}</Text>
        </View>
      </View>

      <View style={[styles.loanDivider, { backgroundColor: colors.dashboard.border }]} />

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.dashboard.textSecondary }]}>{t('repaymentProgress')}</Text>
          <Text style={[styles.progressPercent, { color: colors.deepGreen }]}>{loan.progress}%</Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.dashboard.border }]}>
          <View style={[styles.progressFill, { width: `${loan.progress}%` }]} />
        </View>
        <View style={styles.progressMeta}>
          <Text style={[styles.installments, { color: colors.dashboard.textSecondary }]}>
            {loan.installmentsPaid} of {loan.installmentsTotal} {t('installmentsPaid')}
          </Text>
          <Text style={[styles.remaining, { color: colors.dashboard.textSecondary }]}>
            {loan.installmentsTotal - loan.installmentsPaid} {t('remaining')}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.repayBtn, { backgroundColor: colors.deepGreen }, paying && { opacity: 0.6 }]}
        onPress={onRepay}
        disabled={paying}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ disabled: paying, busy: paying }}
        accessibilityLabel={`${t('repayLoan')} ৳${loan.nextPaymentAmount.toLocaleString('en-BD')}`}
      >
        <Ionicons name="card" size={18} color="#fff" />
        <Text style={styles.repayBtnText}>
          {paying ? t('processingPayment') : `${t('payEmi')} ৳${loan.nextPaymentAmount.toLocaleString('en-BD')}`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ApplicationCard({ app, t, colors }: { app: LoanApplication; t: (key: any) => string; colors: any }) {
  const status = statusConfig[app.status] || statusConfig.pending;
  return (
    <TouchableOpacity
      style={[styles.appCard, { backgroundColor: colors.dashboard.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }]}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${app.title}, ৳${app.amount.toLocaleString('en-BD')}, ${t(status.labelKey as any)}`}
      onPress={() => router.push(`/view/Loans/application-detail?id=${app.id}`)}
    >
      <View style={styles.appTop}>
        <View style={styles.appInfo}>
          <Text style={[styles.appTitle, { color: colors.dashboard.textPrimary }]}>{app.title}</Text>
          <Text style={[styles.appRef, { color: colors.dashboard.textSecondary }]}>{app.id} · {app.date}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{t(status.labelKey as any)}</Text>
        </View>
      </View>

      <View style={[styles.appDivider, { backgroundColor: colors.dashboard.border }]} />

      <View style={styles.appBottom}>
        <View style={styles.appDetail}>
          <Text style={[styles.appDetailLabel, { color: colors.dashboard.textSecondary }]}>{t('amount')}</Text>
          <Text style={[styles.appDetailValue, { color: colors.dashboard.textPrimary }]}>৳{app.amount.toLocaleString('en-BD')}</Text>
        </View>
        <View style={styles.appDetail}>
          <Text style={[styles.appDetailLabel, { color: colors.dashboard.textSecondary }]}>{t('duration')}</Text>
          <Text style={[styles.appDetailValue, { color: colors.dashboard.textPrimary }]}>{app.duration}</Text>
        </View>
        <View style={styles.appDetail}>
          <Text style={[styles.appDetailLabel, { color: colors.dashboard.textSecondary }]}>{t('type')}</Text>
          <Text style={[styles.appDetailValue, { color: colors.dashboard.textPrimary }]}>{app.installmentType === 'monthly' ? t('monthly') : t('seasonal')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function InfoItem({ title, value, colors }: { title: string; value: string; colors: any }) {
  return (
    <View style={styles.infoItem}>
      <Text style={[styles.infoTitle, { color: colors.dashboard.textSecondary }]}>{title}</Text>
      <Text style={[styles.infoValue, { color: colors.dashboard.textPrimary }]}>{value}</Text>
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
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  applyBtn: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 14,
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
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loanCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loanTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  loanRef: {
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  loanDivider: {
    height: 1,
    marginVertical: 14,
  },
  loanDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  infoItem: {
    width: '48%',
  },
  infoTitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  infoValue: {
    fontWeight: '700',
    marginTop: 4,
    fontSize: 14,
  },
  nextPayment: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  nextDate: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  nextAmountWrap: {
    alignItems: 'flex-end',
  },
  nextAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  nextSub: {
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
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBar: {
    height: 10,
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
    fontSize: 12,
  },
  remaining: {
    fontSize: 12,
  },
  repayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    marginTop: 16,
  },
  repayBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  appCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
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
  },
  appRef: {
    fontSize: 11,
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
    fontWeight: '500',
  },
  appDetailValue: {
    fontSize: 13,
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
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    marginTop: 4,
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
