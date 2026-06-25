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

type TabName = "home" | "transactions" | "loans" | "profile";

type TabDef = {
  key: TabName;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
};

export default function DashboardScreen() {
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Ionicons name="leaf" size={20} color="#fff" />
          </View>
        </View>

        <Text style={styles.headerTitle}>{t('dashboard')}</Text>

        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={toggleLang} hitSlop={8} style={styles.langBtn}>
            <Text style={styles.langText}>{lang === 'en' ? 'বাং' : 'EN'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/view/Notifications/notifications')} hitSlop={8}>
            <Ionicons name="notifications-outline" size={22} color="#555" />
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
              <Feather name="user" size={26} color="#fff" />
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
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "#ECFDF5" }]}>
              <Feather name="briefcase" size={18} color="#16A34A" />
            </View>
            <Text style={styles.statValue}>1</Text>
            <Text style={styles.statLabel}>{t('activeLoans')}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="trending-up" size={18} color="#2563EB" />
            </View>
            <Text style={[styles.statValue, { color: "#16A34A" }]}>৳60K</Text>
            <Text style={styles.statLabel}>{t('income')} (Jun)</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "#FEF2F2" }]}>
              <Feather name="trending-down" size={18} color="#DC2626" />
            </View>
            <Text style={[styles.statValue, { color: "#DC2626" }]}>৳19K</Text>
            <Text style={styles.statLabel}>{t('expense')} (Jun)</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('quickActions')}</Text>
        <View style={styles.quickCard}>
          <ActionButton icon="trending-up" label={t('addIncome')} color="#16A34A" onPress={() => router.push('/view/Transactions/transactions')} />
          <ActionButton icon="trending-down" label={t('addExpense')} color="#DC2626" onPress={() => router.push('/view/Transactions/transactions')} />
          <ActionButton icon="credit-card" label={t('applyLoan')} color="#0F766E" onPress={() => router.push('/view/Loans/loans')} />
          <ActionButton icon="user" label={t('myProfile')} color="#7C3AED" onPress={() => router.push('/view/Profile/profile')} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('activeLoan')}</Text>
          <TouchableOpacity onPress={() => router.push('/view/Loans/loans')}>
            <Text style={styles.viewAll}>{t('viewAll')}</Text>
          </TouchableOpacity>
        </View>
        {activeLoans.length > 0 ? (
          <View style={styles.loanCard}>
            <View style={styles.loanTop}>
              <View style={styles.loanTitleRow}>
                <View style={styles.loanIcon}>
                  <Feather name="droplet" size={18} color="#006847" />
                </View>
                <View>
                  <Text style={styles.loanTitle}>{activeLoans[0].title}</Text>
                  <Text style={styles.loanRef}>{activeLoans[0].id} · {t('approved')} {activeLoans[0].date}</Text>
                </View>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t('active')}</Text>
              </View>
            </View>

            <View style={styles.loanDivider} />

            <View style={styles.loanDetails}>
              <InfoItem title={t('loanAmount')} value={`৳${activeLoans[0].amount.toLocaleString('en-BD')}`} />
              <InfoItem title={t('interest')} value={activeLoans[0].interest} />
              <InfoItem title={t('duration')} value={activeLoans[0].duration} />
              <InfoItem title={t('monthlyEMI')} value={`৳${activeLoans[0].emi.toLocaleString('en-BD')}`} />
            </View>

            <View style={styles.loanDivider} />

            <View style={styles.nextPayment}>
              <View>
                <Text style={styles.nextLabel}>{t('nextPaymentDue')}</Text>
                <Text style={styles.nextDate}>{activeLoans[0].nextPaymentDate}</Text>
              </View>
              <View style={styles.nextAmountWrap}>
                <Text style={styles.nextAmount}>৳{activeLoans[0].nextPaymentAmount.toLocaleString('en-BD')}</Text>
                <Text style={styles.nextSub}>{t('emi')}</Text>
              </View>
            </View>

            <View style={styles.loanDivider} />

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>{t('repaymentProgress')}</Text>
                <Text style={styles.progressPercent}>{activeLoans[0].progress}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${activeLoans[0].progress}%` }]} />
              </View>
              <View style={styles.progressMeta}>
                <Text style={styles.installments}>
                  {activeLoans[0].installmentsPaid} of {activeLoans[0].installmentsTotal} {t('installmentsPaid')}
                </Text>
                <Text style={styles.remaining}>
                  {activeLoans[0].installmentsTotal - activeLoans[0].installmentsPaid} {t('remaining')}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyLoan}>
            <Feather name="briefcase" size={32} color="#D1D5DB" />
            <Text style={styles.emptyLoanText}>{t('noActiveLoans')}</Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('recentTransactions')}</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>{t('seeAll')}</Text>
          </TouchableOpacity>
        </View>
        <TransactionRow title="Crop Sales" date="18 Jun 2024" amount="+৳45K" positive />
        <TransactionRow title="Fertilizer" date="15 Jun 2024" amount="-৳9K" />
        <TransactionRow title="Livestock" date="10 Jun 2024" amount="+৳12K" positive />
        <TransactionRow title="Labor" date="8 Jun 2024" amount="-৳6K" />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('notifications')}</Text>
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
        />
        <NotificationItem
          icon="trending-up"
          color="#2563EB"
          title="Credit Score Updated"
          time="1d ago"
          description="Your score increased from 710 to 720. Great financial discipline!"
        />
        <NotificationItem
          icon="shield-checkmark"
          color="#7C3AED"
          title="Profile Verified"
          time="3d ago"
          description="Your farm details have been verified by Field Officer Khorshed Alam."
        />
        <NotificationItem
          icon="document-text"
          color="#F59E0B"
          title="Document Required"
          time="5d ago"
          description="Please upload your land deed to complete your loan application."
        />
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
                  color={isActive ? "#fff" : "#9CA3AF"}
                />
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
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

function InfoItem({ title, value }: { title: string; value: string }) {
  return (
    <View>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function TransactionRow({
  title,
  date,
  amount,
  positive,
}: {
  title: string;
  date: string;
  amount: string;
  positive?: boolean;
}) {
  return (
    <View style={styles.txRow}>
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
          <Text style={styles.txTitle}>{title}</Text>
          <Text style={styles.txDate}>{date}</Text>
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
}: {
  icon: string;
  color: string;
  title: string;
  time: string;
  description: string;
}) {
  return (
    <View style={styles.notifRow}>
      <View style={[styles.notifIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <View style={styles.notifContent}>
        <View style={styles.notifTop}>
          <Text style={styles.notifTitle}>{title}</Text>
          <Text style={styles.notifTime}>{time}</Text>
        </View>
        <Text style={styles.notifDesc}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8F8",
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
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
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
    backgroundColor: "#006847",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
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
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#1B7A60",
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: "#fff",
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
    color: "#1F2937",
  },
  statLabel: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
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
    backgroundColor: "#fff",
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
    backgroundColor: "#fff",
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
    color: "#1F2937",
  },
  loanRef: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: "#2563EB",
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
    backgroundColor: "#F3F4F6",
    marginVertical: 14,
  },
  loanDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoTitle: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "500",
  },
  infoValue: {
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 4,
    fontSize: 14,
  },
  nextPayment: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nextLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "500",
  },
  nextDate: {
    color: "#1F2937",
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
    color: "#6B7280",
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
    color: "#4B5563",
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: "700",
    color: "#006847",
  },
  progressBar: {
    height: 10,
    backgroundColor: "#E5E7EB",
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
    color: "#6B7280",
    fontSize: 12,
  },
  remaining: {
    color: "#9CA3AF",
    fontSize: 12,
  },
  txRow: {
    backgroundColor: "#fff",
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
    color: "#1F2937",
    fontSize: 14,
  },
  txDate: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },
  txAmount: {
    fontWeight: "700",
    fontSize: 15,
  },
  notifRow: {
    backgroundColor: "#fff",
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
    color: "#1F2937",
    fontSize: 14,
    flex: 1,
  },
  notifTime: {
    color: "#9CA3AF",
    fontSize: 11,
    marginLeft: 8,
  },
  notifDesc: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  emptyLoan: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    gap: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  emptyLoanText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingTop: 6,
    paddingBottom: 12,
    paddingHorizontal: 8,
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
  navIconWrapActive: {
    backgroundColor: "#006847",
  },
  navLabel: {
    fontSize: 11,
    marginTop: 4,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  navLabelActive: {
    color: "#006847",
    fontWeight: "700",
  },
});
