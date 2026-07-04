import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import {
  Feather,
  Ionicons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import { useLoans } from "../../../contexts/LoanContext";
import { useNotifications } from "../../../contexts/NotificationContext";
import { useTranslation } from "../../../hooks/use-translation";
import { useColors } from '../../../features/officials/shared/constants/theme';

type TabName = "home" | "transactions" | "loans" | "profile";

type TabDef = {
  key: TabName;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function DashboardScreen() {
  const colors = useColors();
  const { activeLoans } = useLoans();
  const { unreadCount } = useNotifications();
  const { t, lang, toggleLang } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabName>("home");

  const tabs: TabDef[] = [
    { key: "home", activeIcon: "home", inactiveIcon: "home-outline", labelKey: "home" },
    { key: "transactions", activeIcon: "repeat", inactiveIcon: "repeat-outline", labelKey: "transactionsTab" },
    { key: "loans", activeIcon: "wallet", inactiveIcon: "wallet-outline", labelKey: "loansTab" },
    { key: "profile", activeIcon: "person", inactiveIcon: "person-outline", labelKey: "profileTab" },
  ];

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (tab === "home") return;
    if (tab === "transactions") {
      router.push('/view/Transactions/transactions');
      return;
    }
    if (tab === "loans") {
      router.push('/view/Loans/loans');
      return;
    }
    if (tab === "profile") {
      router.push('/view/Profile/profile');
      return;
    }
  };

  const farmerInitials = getInitials(t('farmerName'));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.dashboard.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.dashboard.cardBg, borderBottomColor: colors.dashboard.border }]}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Ionicons name="leaf" size={20} color="#fff" />
          </View>
        </View>

        <Text style={[styles.headerTitle, { color: colors.dashboard.textPrimary }]}>{t('dashboard')}</Text>

        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={toggleLang} hitSlop={8} style={[styles.langBtn, { backgroundColor: colors.userVerified }]}>
            <Text style={[styles.langText, { color: colors.userVerifiedText }]}>{lang === 'en' ? 'বাং' : 'EN'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/view/Notifications/notifications')} hitSlop={8}>
            <Ionicons name="notifications-outline" size={22} color={colors.dashboard.textSecondary} />
            {unreadCount > 0 && (
              <View style={styles.badgeDot}>
                <Text style={styles.badgeCount}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
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
              <Text style={styles.welcomeLabel}>{t('welcomeBack')}</Text>
              <Text style={styles.farmerName}>{t('farmerName')}</Text>
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={14} color="#BBF7D0" />
                <Text style={styles.locationText}>Char Fasson, Bhola</Text>
              </View>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{farmerInitials}</Text>
            </View>
          </View>

          <View style={styles.scoreCard}>
            <View style={styles.scoreHeader}>
              <Text style={styles.scoreLabel}>{t('creditScore')}</Text>
              <TouchableOpacity>
                <Text style={styles.scoreDetails}>{t('details')} →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreValue}>720</Text>
              <Text style={styles.scoreRange}>{t('outOf')}</Text>
            </View>
            <View style={styles.scoreMeta}>
              <View style={styles.riskBadge}>
                <View style={styles.riskDot} />
                <Text style={styles.riskText}>{t('lowRisk')}</Text>
              </View>
            </View>
            <View style={styles.ratingBarTrack}>
              <View style={[styles.ratingBarFill, { width: "85%" }]} />
            </View>
            <View style={styles.ratingLabels}>
              <Text style={styles.ratingLabel}>{t('poor')}</Text>
              <Text style={styles.ratingLabel}>{t('fair')}</Text>
              <Text style={[styles.ratingLabel, styles.ratingLabelActive]}>{t('good')}</Text>
              <Text style={styles.ratingLabel}>{t('excellent')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.dashboard.cardBg }]}>
            <View style={[styles.statIconWrap, { backgroundColor: "#ECFDF5" }]}>
              <Feather name="briefcase" size={18} color="#16A34A" />
            </View>
            <Text style={[styles.statValue, { color: colors.dashboard.textPrimary }]}>1</Text>
            <Text style={[styles.statLabel, { color: colors.dashboard.textSecondary }]}>{t('activeLoans')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.dashboard.cardBg }]}>
            <View style={[styles.statIconWrap, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="trending-up" size={18} color="#2563EB" />
            </View>
            <Text style={[styles.statValue, { color: "#16A34A" }]}>৳60K</Text>
            <Text style={[styles.statLabel, { color: colors.dashboard.textSecondary }]}>{t('income')} (Jun)</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.dashboard.cardBg }]}>
            <View style={[styles.statIconWrap, { backgroundColor: "#FEF2F2" }]}>
              <Feather name="trending-down" size={18} color="#DC2626" />
            </View>
            <Text style={[styles.statValue, { color: "#DC2626" }]}>৳19K</Text>
            <Text style={[styles.statLabel, { color: colors.dashboard.textSecondary }]}>{t('expense')} (Jun)</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.dashboard.textPrimary }]}>{t('quickActions')}</Text>
        <View style={[styles.quickCard, { backgroundColor: colors.dashboard.cardBg }]}>
          <ActionButton icon="trending-up" label={t('addIncome')} color="#16A34A" onPress={() => router.push('/view/Transactions/transactions')} />
          <ActionButton icon="trending-down" label={t('addExpense')} color="#DC2626" onPress={() => router.push('/view/Transactions/transactions')} />
          <ActionButton icon="credit-card" label={t('applyLoan')} color="#0F766E" onPress={() => router.push('/view/Loans/loans')} />
          <ActionButton icon="user" label={t('myProfile')} color="#7C3AED" onPress={() => router.push('/view/Profile/profile')} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.dashboard.textPrimary }]}>{t('activeLoan')}</Text>
          <TouchableOpacity onPress={() => router.push('/view/Loans/loans')}>
            <Text style={styles.viewAll}>{t('viewAll')}</Text>
          </TouchableOpacity>
        </View>
        {activeLoans.length > 0 ? (
          <View style={[styles.loanCard, { backgroundColor: colors.dashboard.cardBg }]}>
            <View style={styles.loanTop}>
              <View style={styles.loanTitleRow}>
                <View style={styles.loanIcon}>
                  <Feather name="droplet" size={18} color="#006847" />
                </View>
                <View>
                  <Text style={[styles.loanTitle, { color: colors.dashboard.textPrimary }]}>{activeLoans[0].title}</Text>
                  <Text style={[styles.loanRef, { color: colors.dashboard.textSecondary }]}>{activeLoans[0].id} · {t('approved')} {activeLoans[0].date}</Text>
                </View>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.userVerified }]}>
                <Text style={[styles.badgeText, { color: colors.userVerifiedText }]}>{t('active')}</Text>
              </View>
            </View>

            <View style={[styles.loanDivider, { backgroundColor: colors.dashboard.border }]} />

            <View style={styles.loanDetails}>
              <InfoItem title={t('loanAmount')} value={`৳${activeLoans[0].amount.toLocaleString('en-BD')}`} colors={colors} />
              <InfoItem title={t('interest')} value={activeLoans[0].interest} colors={colors} />
              <InfoItem title={t('duration')} value={activeLoans[0].duration} colors={colors} />
              <InfoItem title={t('monthlyEMI')} value={`৳${activeLoans[0].emi.toLocaleString('en-BD')}`} colors={colors} />
            </View>

            <View style={[styles.loanDivider, { backgroundColor: colors.dashboard.border }]} />

            <View style={styles.nextPayment}>
              <View>
                <Text style={[styles.nextLabel, { color: colors.dashboard.textSecondary }]}>{t('nextPaymentDue')}</Text>
                <Text style={[styles.nextDate, { color: colors.dashboard.textPrimary }]}>{activeLoans[0].nextPaymentDate}</Text>
              </View>
              <View style={styles.nextAmountWrap}>
                <Text style={styles.nextAmount}>৳{activeLoans[0].nextPaymentAmount.toLocaleString('en-BD')}</Text>
                <Text style={[styles.nextSub, { color: colors.dashboard.textSecondary }]}>{t('emi')}</Text>
              </View>
            </View>

            <View style={[styles.loanDivider, { backgroundColor: colors.dashboard.border }]} />

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.dashboard.textSecondary }]}>{t('repaymentProgress')}</Text>
                <Text style={styles.progressPercent}>{activeLoans[0].progress}%</Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.dashboard.border }]}>
                <View style={[styles.progressFill, { width: `${activeLoans[0].progress}%` }]} />
              </View>
              <View style={styles.progressMeta}>
                <Text style={[styles.installments, { color: colors.dashboard.textSecondary }]}>
                  {activeLoans[0].installmentsPaid} of {activeLoans[0].installmentsTotal} {t('installmentsPaid')}
                </Text>
                <Text style={[styles.remaining, { color: colors.dashboard.textSecondary }]}>
                  {activeLoans[0].installmentsTotal - activeLoans[0].installmentsPaid} {t('remaining')}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.emptyLoan, { backgroundColor: colors.dashboard.cardBg }]}>
            <Feather name="briefcase" size={32} color={colors.dashboard.textSecondary} />
            <Text style={[styles.emptyLoanText, { color: colors.dashboard.textSecondary }]}>{t('noActiveLoans')}</Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.dashboard.textPrimary }]}>{t('recentTransactions')}</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>{t('seeAll')}</Text>
          </TouchableOpacity>
        </View>
        <TransactionRow title="Crop Sales" date="18 Jun 2024" amount="+৳45K" positive colors={colors} />
        <TransactionRow title="Fertilizer" date="15 Jun 2024" amount="-৳9K" colors={colors} />
        <TransactionRow title="Livestock" date="10 Jun 2024" amount="+৳12K" positive colors={colors} />
        <TransactionRow title="Labor" date="8 Jun 2024" amount="-৳6K" colors={colors} />

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.dashboard.textPrimary }]}>{t('notifications')}</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>{t('viewAll')}</Text>
          </TouchableOpacity>
        </View>
        <NotificationItem
          icon="checkmark-circle"
          color="#16A34A"
          title="Loan Approved!"
          time="2h ago"
          description="Your application L-2024-004 for ৳60,000 has been approved by Sonali Bank."
          colors={colors}
        />
        <NotificationItem
          icon="trending-up"
          color="#2563EB"
          title="Credit Score Updated"
          time="1d ago"
          description="Your score increased from 710 to 720. Great financial discipline!"
          colors={colors}
        />
        <NotificationItem
          icon="shield-checkmark"
          color="#7C3AED"
          title="Profile Verified"
          time="3d ago"
          description="Your farm details have been verified by Field Officer Khorshed Alam."
          colors={colors}
        />
        <NotificationItem
          icon="document-text"
          color="#F59E0B"
          title="Document Required"
          time="5d ago"
          description="Please upload your land deed to complete your loan application."
          colors={colors}
        />
      </ScrollView>

      <View style={[styles.bottomNav, { backgroundColor: colors.dashboard.cardBg, borderTopColor: colors.dashboard.border }]}>
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
                  color={isActive ? "#fff" : colors.dashboard.textSecondary}
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

function ActionButton({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.actionItem} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: `${color}12` }]}>
        <Feather name={icon as any} size={22} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoItem({ title, value, colors }: { title: string; value: string; colors: any }) {
  return (
    <View>
      <Text style={[styles.infoTitle, { color: colors.dashboard.textSecondary }]}>{title}</Text>
      <Text style={[styles.infoValue, { color: colors.dashboard.textPrimary }]}>{value}</Text>
    </View>
  );
}

function TransactionRow({
  title,
  date,
  amount,
  positive,
  colors,
}: {
  title: string;
  date: string;
  amount: string;
  positive?: boolean;
  colors: any;
}) {
  return (
    <View style={[styles.txRow, { backgroundColor: colors.dashboard.cardBg }]}>
      <View style={styles.txLeft}>
        <View
          style={[
            styles.txIcon,
            { backgroundColor: positive ? "#ECFDF5" : "#FEF2F2" },
          ]}
        >
          <Feather
            name={positive ? "arrow-up-right" : "arrow-down-left"}
            size={16}
            color={positive ? "#16A34A" : "#DC2626"}
          />
        </View>
        <View>
          <Text style={[styles.txTitle, { color: colors.dashboard.textPrimary }]}>{title}</Text>
          <Text style={[styles.txDate, { color: colors.dashboard.textSecondary }]}>{date}</Text>
        </View>
      </View>
      <Text
        style={[
          styles.txAmount,
          { color: positive ? "#16A34A" : "#DC2626" },
        ]}
      >
        {amount}
      </Text>
    </View>
  );
}

function NotificationItem({
  icon,
  color,
  title,
  time,
  description,
  colors,
}: {
  icon: string;
  color: string;
  title: string;
  time: string;
  description: string;
  colors: any;
}) {
  return (
    <View style={[styles.notifRow, { backgroundColor: colors.dashboard.cardBg }]}>
      <View style={[styles.notifIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <View style={styles.notifContent}>
        <View style={styles.notifTop}>
          <Text style={[styles.notifTitle, { color: colors.dashboard.textPrimary }]}>{title}</Text>
          <Text style={[styles.notifTime, { color: colors.dashboard.textSecondary }]}>{time}</Text>
        </View>
        <Text style={[styles.notifDesc, { color: colors.dashboard.textSecondary }]}>{description}</Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
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
    backgroundColor: "#006847",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroCard: {
    backgroundColor: "#006847",
    borderRadius: 20,
    padding: 20,
    marginTop: 18,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroInfo: {
    flex: 1,
  },
  welcomeLabel: {
    color: "#BBF7D0",
    fontSize: 13,
    fontWeight: "500",
  },
  farmerName: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    marginTop: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  locationText: {
    color: "#BBF7D0",
    fontSize: 13,
    marginLeft: 6,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#1B7A60",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  scoreCard: {
    backgroundColor: "#1B7A60",
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  scoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreLabel: {
    color: "#BBF7D0",
    fontSize: 12,
    fontWeight: "500",
  },
  scoreDetails: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  scoreValue: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "700",
  },
  scoreRange: {
    color: "#9FE0B0",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  scoreMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22C55E20",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
    marginRight: 5,
  },
  riskText: {
    color: "#BBF7D0",
    fontSize: 12,
    fontWeight: "600",
  },
  ratingBarTrack: {
    height: 6,
    backgroundColor: "#FFFFFF30",
    borderRadius: 3,
    marginTop: 14,
    overflow: "hidden",
  },
  ratingBarFill: {
    height: 6,
    backgroundColor: "#22C55E",
    borderRadius: 3,
  },
  ratingLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  ratingLabel: {
    color: "#9FE0B0",
    fontSize: 10,
    fontWeight: "500",
  },
  ratingLabelActive: {
    color: "#fff",
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
  },
  viewAll: {
    color: "#006847",
    fontWeight: "600",
    fontSize: 13,
  },
  quickCard: {
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    marginBottom: 4,
  },
  actionItem: {
    alignItems: "center",
    flex: 1,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    marginTop: 8,
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "500",
  },
  loanCard: {
    borderRadius: 20,
    padding: 18,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  loanTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  loanTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  loanIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  loanTitle: {
    fontSize: 16,
    fontWeight: "700",
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
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  badgeDot: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: "#DC2626",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeCount: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  loanDivider: {
    height: 1,
    marginVertical: 14,
  },
  loanDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoTitle: {
    fontSize: 11,
    fontWeight: "500",
  },
  infoValue: {
    fontWeight: "700",
    marginTop: 4,
    fontSize: 14,
  },
  nextPayment: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nextLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  nextDate: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  nextAmountWrap: {
    alignItems: "flex-end",
  },
  nextAmount: {
    color: "#006847",
    fontSize: 18,
    fontWeight: "700",
  },
  nextSub: {
    fontSize: 11,
    marginTop: 1,
  },
  progressSection: {},
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: "700",
    color: "#006847",
  },
  progressBar: {
    height: 10,
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: 10,
    backgroundColor: "#22C55E",
    borderRadius: 10,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  installments: {
    fontSize: 12,
  },
  remaining: {
    fontSize: 12,
  },
  txRow: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  txTitle: {
    fontWeight: "600",
    fontSize: 14,
  },
  txDate: {
    fontSize: 12,
    marginTop: 2,
  },
  txAmount: {
    fontWeight: "700",
    fontSize: 15,
  },
  notifRow: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
  },
  notifTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notifTitle: {
    fontWeight: "700",
    fontSize: 14,
    flex: 1,
  },
  notifTime: {
    fontSize: 11,
    marginLeft: 8,
  },
  notifDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  emptyLoan: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    gap: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  emptyLoanText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    boxShadow: "0 -2px 8px rgba(0,0,0,0.06)",
  },
  navItem: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 4,
  },
  navIconWrap: {
    width: 40,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  navLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: "500",
  },
});
