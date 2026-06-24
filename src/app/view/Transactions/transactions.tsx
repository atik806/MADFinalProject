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
import { useAuth } from '../../../contexts/AuthContext';
import {
  useTransactions,
  type Transaction,
} from '../../../contexts/TransactionContext';

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

type FilterType = 'all' | 'income' | 'expense';

export default function TransactionsScreen() {
  const { logout } = useAuth();
  const { transactions, removeTransaction } = useTransactions();
  const [activeTab, setActiveTab] = useState<TabName>('transactions');
  const [filter, setFilter] = useState<FilterType>('all');

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (tab === 'transactions') return;
    if (tab === 'home') {
      router.push('/view/FarmerDashboard/farmer-dashboard');
      return;
    }
    Alert.alert(
      'শীঘ্রই আসছে / Coming Soon',
      `"${tabs.find((t) => t.key === tab)?.label}" বিভাগটি শীঘ্রই যুক্ত হবে।`,
    );
  };

  const totalIncome = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>S</Text>
          </View>
          <Text style={styles.brand}>SOFOL</Text>
        </View>
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={handleLogout} hitSlop={8}>
            <Ionicons name="log-out-outline" size={22} color="#DC2626" />
          </TouchableOpacity>
          <Ionicons name="notifications-outline" size={22} color="#555" style={{ marginLeft: 14 }} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.summaryHero}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Income</Text>
              <Text style={[styles.summaryValue, { color: '#16A34A' }]}>
                ৳{totalIncome.toLocaleString('en-BD')}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Expense</Text>
              <Text style={[styles.summaryValue, { color: '#DC2626' }]}>
                ৳{totalExpense.toLocaleString('en-BD')}
              </Text>
            </View>
          </View>
          <View style={styles.netRow}>
            <Feather name="bar-chart-2" size={18} color={netSavings >= 0 ? '#16A34A' : '#DC2626'} />
            <Text style={styles.netLabel}>Net Savings (June 2024)</Text>
            <Text
              style={[
                styles.netValue,
                { color: netSavings >= 0 ? '#16A34A' : '#DC2626' },
              ]}
            >
              ৳{netSavings.toLocaleString('en-BD')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/view/Transactions/add-transaction')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add Transaction</Text>
        </TouchableOpacity>

        <View style={styles.filterRow}>
          {(['all', 'income', 'expense'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.filterDot,
                  {
                    backgroundColor:
                      f === 'all' ? '#006847' : f === 'income' ? '#16A34A' : '#DC2626',
                    opacity: filter === f ? 1 : 0.3,
                  },
                ]}
              />
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}
              >
                {f === 'all' ? 'All' : f === 'income' ? 'Income' : 'Expense'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="inbox" size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySub}>{'Tap \u201cAdd Transaction\u201d to get started'}</Text>
          </View>
        ) : (
          filtered.map((tx) => (
            <TouchableOpacity
              key={tx.id}
              style={styles.txRow}
              onLongPress={() => {
                Alert.alert('Delete Transaction', `Remove "${tx.title}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => removeTransaction(tx.id) },
                ]);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.txLeft}>
                <View
                  style={[
                    styles.txIcon,
                    { backgroundColor: tx.amount > 0 ? '#ECFDF5' : '#FEF2F2' },
                  ]}
                >
                  <Feather
                    name={tx.amount > 0 ? 'arrow-up-right' : 'arrow-down-left'}
                    size={16}
                    color={tx.amount > 0 ? '#16A34A' : '#DC2626'}
                  />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txTitle}>{tx.title}</Text>
                  <Text style={styles.txDesc}>
                    {tx.description} · {tx.date}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.txAmountBadge,
                  { backgroundColor: tx.amount > 0 ? '#ECFDF5' : '#FEF2F2' },
                ]}
              >
                <Text
                  style={[
                    styles.txAmount,
                    { color: tx.amount > 0 ? '#16A34A' : '#DC2626' },
                  ]}
                >
                  {formatAmount(tx.amount)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
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
  summaryHero: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginTop: 18,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
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
    backgroundColor: '#F0F0F0',
    marginVertical: -18,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#9CA3AF',
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
    borderTopColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  netLabel: {
    fontSize: 12,
    color: '#6B7280',
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
    backgroundColor: '#006847',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterBtnActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#006847',
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#006847',
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
  txRow: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
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
    color: '#1F2937',
    fontSize: 14,
  },
  txDesc: {
    color: '#9CA3AF',
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
