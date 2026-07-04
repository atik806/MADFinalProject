import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import {
  useTransactions,
  type Transaction,
} from '../../../contexts/TransactionContext';
import { useTranslation } from '../../../hooks/use-translation';
import { useColors } from '../../../features/officials/shared/constants/theme';

type TabName = 'home' | 'transactions' | 'loans' | 'profile';

type TabDef = {
  key: TabName;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
};

type FilterType = 'all' | 'income' | 'expense';

export default function TransactionsScreen() {
  const colors = useColors();
  const { transactions, removeTransaction } = useTransactions();
  const { t, lang, toggleLang } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabName>('transactions');
  const [filter, setFilter] = useState<FilterType>('all');

  const tabs: TabDef[] = [
    { key: 'home', activeIcon: 'home', inactiveIcon: 'home-outline', labelKey: 'home' },
    { key: 'transactions', activeIcon: 'repeat', inactiveIcon: 'repeat-outline', labelKey: 'transactionsTab' },
    { key: 'loans', activeIcon: 'wallet', inactiveIcon: 'wallet-outline', labelKey: 'loansTab' },
    { key: 'profile', activeIcon: 'person', inactiveIcon: 'person-outline', labelKey: 'profileTab' },
  ];

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (tab === 'transactions') return;
    if (tab === 'home') {
      router.push('/view/FarmerDashboard/farmer-dashboard');
      return;
    }
    if (tab === 'loans') {
      router.push('/view/Loans/loans');
      return;
    }
    if (tab === 'profile') {
      router.push('/view/Profile/profile');
      return;
    }
  };

  const totalIncome = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const netSavings = totalIncome - totalExpense;

  const filtered: Transaction[] =
    filter === 'all'
      ? transactions
      : filter === 'income'
        ? transactions.filter((t) => t.amount > 0)
        : transactions.filter((t) => t.amount < 0);

  const formatAmount = (val: number) => {
    const abs = Math.abs(val).toLocaleString('en-BD');
    return val >= 0 ? `+৳${abs}` : `-৳${abs}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.dashboard.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.dashboard.cardBg, borderBottomColor: colors.dashboard.border }]}>
        <View style={styles.logoContainer}>
          <View style={[styles.logo, { backgroundColor: colors.deepGreen }]}>
            <Ionicons name="leaf" size={20} color="#fff" />
          </View>
        </View>
        <Text style={[styles.headerTitle, { color: colors.dashboard.textPrimary }]}>{t('transactions')}</Text>
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
        <View style={[styles.summaryHero, { backgroundColor: colors.dashboard.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryLabel, { color: colors.dashboard.textSecondary }]}>{t('totalIncome')}</Text>
              <Text style={[styles.summaryValue, { color: colors.dashboard.greenUp }]}>
                ৳{totalIncome.toLocaleString('en-BD')}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.dashboard.border }]} />
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryLabel, { color: colors.dashboard.textSecondary }]}>{t('totalExpense')}</Text>
              <Text style={[styles.summaryValue, { color: colors.dashboard.redDown }]}>
                ৳{totalExpense.toLocaleString('en-BD')}
              </Text>
            </View>
          </View>
          <View style={[styles.netRow, { borderTopColor: colors.dashboard.border }]}>
            <Feather name="bar-chart-2" size={18} color={netSavings >= 0 ? colors.dashboard.greenUp : colors.dashboard.redDown} />
            <Text style={[styles.netLabel, { color: colors.dashboard.textSecondary }]}>{t('netSavings')} (June 2024)</Text>
            <Text
              style={[
                styles.netValue,
                { color: netSavings >= 0 ? colors.dashboard.greenUp : colors.dashboard.redDown },
              ]}
            >
              ৳{netSavings.toLocaleString('en-BD')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.deepGreen }]}
          onPress={() => router.push('/view/Transactions/add-transaction')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addBtnText}>{t('addTransaction')}</Text>
        </TouchableOpacity>

        <View style={styles.filterRow}>
          {(['all', 'income', 'expense'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }, filter === f && { backgroundColor: colors.userVerified, borderColor: colors.deepGreen }]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.filterDot,
                  {
                    backgroundColor: f === 'all' ? colors.deepGreen : f === 'income' ? colors.dashboard.greenUp : colors.dashboard.redDown,
                    opacity: filter === f ? 1 : 0.3,
                  },
                ]}
              />
              <Text
                style={[
                  styles.filterText,
                  { color: colors.dashboard.textSecondary },
                  filter === f && { color: colors.deepGreen },
                ]}
              >
                {f === 'all' ? t('all') : f === 'income' ? t('income') : t('expense')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="inbox" size={40} color={colors.dashboard.border} />
            <Text style={[styles.emptyText, { color: colors.dashboard.textSecondary }]}>{t('noTransactions')}</Text>
            <Text style={[styles.emptySub, { color: colors.dashboard.border }]}>{t('tapToAdd')}</Text>
          </View>
        ) : (
          filtered.map((tx) => (
            <TouchableOpacity
              key={tx.id}
              style={[styles.txRow, { backgroundColor: colors.dashboard.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }]}
              onLongPress={() => {
                Alert.alert(t('deleteTransaction'), `Remove "${tx.title}"?`, [
                  { text: t('cancel'), style: 'cancel' },
                  { text: t('removeConfirm'), style: 'destructive', onPress: () => removeTransaction(tx.id) },
                ]);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.txLeft}>
                <View
                  style={[
                    styles.txIcon,
                    { backgroundColor: tx.amount > 0 ? colors.userVerified : colors.userRejected },
                  ]}
                >
                  <Feather
                    name={tx.amount > 0 ? 'arrow-up-right' : 'arrow-down-left'}
                    size={16}
                    color={tx.amount > 0 ? colors.dashboard.greenUp : colors.dashboard.redDown}
                  />
                </View>
                <View style={styles.txInfo}>
                  <Text style={[styles.txTitle, { color: colors.dashboard.textPrimary }]}>{tx.title}</Text>
                  <Text style={[styles.txDesc, { color: colors.dashboard.textSecondary }]}>
                    {tx.description} · {tx.date}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.txAmountBadge,
                  { backgroundColor: tx.amount > 0 ? colors.userVerified : colors.userRejected },
                ]}
              >
                <Text
                  style={[
                    styles.txAmount,
                    { color: tx.amount > 0 ? colors.dashboard.greenUp : colors.dashboard.redDown },
                  ]}
                >
                  {formatAmount(tx.amount)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
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
  summaryHero: {
    borderRadius: 18,
    marginTop: 18,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    marginVertical: -18,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 6,
  },
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  netLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  netValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    gap: 8,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    marginBottom: 14,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
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
  txRow: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontWeight: '600',
    fontSize: 14,
  },
  txDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  txAmountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  txAmount: {
    fontWeight: '700',
    fontSize: 13,
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
