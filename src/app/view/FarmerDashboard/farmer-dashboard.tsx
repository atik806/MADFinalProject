import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  Feather,
  Ionicons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../../contexts/AuthContext";

type TabName = "home" | "transactions" | "loans" | "profile";

type TabDef = {
  key: TabName;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  label: string;
};

const tabs: TabDef[] = [
  { key: "home", activeIcon: "home", inactiveIcon: "home-outline", label: "Home" },
  { key: "transactions", activeIcon: "repeat", inactiveIcon: "repeat-outline", label: "Transactions" },
  { key: "loans", activeIcon: "wallet", inactiveIcon: "wallet-outline", label: "Loans" },
  { key: "profile", activeIcon: "person", inactiveIcon: "person-outline", label: "Profile" },
];

export default function DashboardScreen() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>("home");

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (tab === "home") return;
    if (tab === "transactions") {
      router.push('/view/Transactions/transactions');
      return;
    }
    Alert.alert(
      "শীঘ্রই আসছে / Coming Soon",
      `"${tabs.find((t) => t.key === tab)?.label}" বিভাগটি শীঘ্রই যুক্ত হবে।`,
    );
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

        <Text style={styles.headerTitle}>Dashboard</Text>

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
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroInfo}>
              <Text style={styles.welcomeLabel}>স্বাগতম / Welcome back</Text>
              <Text style={styles.farmerName}>Mohammad Rahim</Text>
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
              <Text style={styles.scoreLabel}>ক্রেডিট স্কোর / Credit Score</Text>
              <TouchableOpacity>
                <Text style={styles.scoreDetails}>Details →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreValue}>720</Text>
              <Text style={styles.scoreRange}>out of 850</Text>
            </View>
            <View style={styles.scoreMeta}>
              <View style={styles.riskBadge}>
                <View style={styles.riskDot} />
                <Text style={styles.riskText}>Low Risk</Text>
              </View>
            </View>
            <View style={styles.ratingBarTrack}>
              <View style={[styles.ratingBarFill, { width: "85%" }]} />
            </View>
            <View style={styles.ratingLabels}>
              <Text style={styles.ratingLabel}>Poor</Text>
              <Text style={styles.ratingLabel}>Fair</Text>
              <Text style={[styles.ratingLabel, styles.ratingLabelActive]}>Good</Text>
              <Text style={styles.ratingLabel}>Excellent</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "#ECFDF5" }]}>
              <Feather name="briefcase" size={18} color="#16A34A" />
            </View>
            <Text style={styles.statValue}>1</Text>
            <Text style={styles.statLabel}>Active Loans</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="trending-up" size={18} color="#2563EB" />
            </View>
            <Text style={[styles.statValue, { color: "#16A34A" }]}>৳60K</Text>
            <Text style={styles.statLabel}>Income (Jun)</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "#FEF2F2" }]}>
              <Feather name="trending-down" size={18} color="#DC2626" />
            </View>
            <Text style={[styles.statValue, { color: "#DC2626" }]}>৳19K</Text>
            <Text style={styles.statLabel}>Expense (Jun)</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickCard}>
          <ActionButton icon="trending-up" label="Add Income" color="#16A34A" />
          <ActionButton icon="trending-down" label="Add Expense" color="#DC2626" />
          <ActionButton icon="credit-card" label="Apply Loan" color="#0F766E" />
          <ActionButton icon="user" label="My Profile" color="#7C3AED" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Loan</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loanCard}>
          <View style={styles.loanTop}>
            <View style={styles.loanTitleRow}>
              <View style={styles.loanIcon}>
                <Feather name="droplet" size={18} color="#006847" />
              </View>
              <View>
                <Text style={styles.loanTitle}>Vegetable Irrigation</Text>
                <Text style={styles.loanRef}>L-2024-004 · Approved 5 Jun 2024</Text>
              </View>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ACTIVE</Text>
            </View>
          </View>

          <View style={styles.loanDivider} />

          <View style={styles.loanDetails}>
            <InfoItem title="Loan Amount" value="৳60,000" />
            <InfoItem title="Interest" value="8.5%" />
            <InfoItem title="Duration" value="8 months" />
            <InfoItem title="Monthly EMI" value="৳7,500" />
          </View>

          <View style={styles.loanDivider} />

          <View style={styles.nextPayment}>
            <View>
              <Text style={styles.nextLabel}>Next Payment Due</Text>
              <Text style={styles.nextDate}>15 Jul 2024</Text>
            </View>
            <View style={styles.nextAmountWrap}>
              <Text style={styles.nextAmount}>৳7,500</Text>
              <Text style={styles.nextSub}>EMI</Text>
            </View>
          </View>

          <View style={styles.loanDivider} />

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Repayment Progress</Text>
              <Text style={styles.progressPercent}>25%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={styles.progressFill} />
            </View>
            <View style={styles.progressMeta}>
              <Text style={styles.installments}>2 of 8 installments paid</Text>
              <Text style={styles.remaining}>6 remaining</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <TransactionRow title="Crop Sales" date="18 Jun 2024" amount="+৳45K" positive />
        <TransactionRow title="Fertilizer" date="15 Jun 2024" amount="-৳9K" />
        <TransactionRow title="Livestock" date="10 Jun 2024" amount="+৳12K" positive />
        <TransactionRow title="Labor" date="8 Jun 2024" amount="-৳6K" />
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
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function ActionButton({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <TouchableOpacity style={styles.actionItem}>
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
  logo: {
    width: 32,
    height: 32,
    backgroundColor: "#006847",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  brand: {
    marginLeft: 8,
    fontWeight: "700",
    fontSize: 16,
    color: "#006847",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
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
    width: "25%",
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
