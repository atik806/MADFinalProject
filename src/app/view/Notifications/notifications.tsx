import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useNotifications } from "../../../contexts/NotificationContext";
import { useTranslation } from "../../../hooks/use-translation";
import { useColors } from "../../../features/officials/shared/constants/theme";

export default function NotificationsScreen() {
  const colors = useColors();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } =
    useNotifications();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.dashboard.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.dashboard.cardBg, borderBottomColor: colors.dashboard.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.dashboard.textPrimary} />
          </TouchableOpacity>
          <View style={[styles.headerLogo, { backgroundColor: colors.deepGreen }]}>
            <Ionicons name="leaf" size={18} color="#fff" />
          </View>
        </View>
        <Text style={[styles.headerTitle, { color: colors.dashboard.textPrimary }]}>{t('notifications')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {notifications.length > 0 && (
        <View style={[styles.actions, { backgroundColor: colors.dashboard.cardBg, borderBottomColor: colors.dashboard.border }]}>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.actionBtn} onPress={markAllAsRead}>
              <Ionicons name="checkmark-done" size={16} color={colors.deepGreen} />
              <Text style={[styles.actionText, { color: colors.deepGreen }]}>{t('markAllRead')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={clearNotifications}>
            <Ionicons name="trash-outline" size={16} color={colors.dashboard.redDown} />
            <Text style={[styles.actionText, { color: colors.dashboard.redDown }]}>{t('clearAll')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={48} color={colors.dashboard.border} />
          <Text style={[styles.emptyTitle, { color: colors.dashboard.textSecondary }]}>{t('noNotifications')}</Text>
          <Text style={[styles.emptyDesc, { color: colors.dashboard.textSecondary }]}>{t('allCaughtUp')}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {notifications.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              style={[styles.notifRow, { backgroundColor: colors.dashboard.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }, !notif.read && { backgroundColor: colors.userVerified }]}
              onPress={() => markAsRead(notif.id)}
              activeOpacity={0.7}
            >
              {!notif.read && <View style={[styles.unreadDot, { backgroundColor: colors.deepGreen }]} />}
              <View style={[styles.notifIcon, { backgroundColor: `${notif.color}18` }]}>
                <Ionicons name={notif.icon as any} size={18} color={notif.color} />
              </View>
              <View style={styles.notifContent}>
                <View style={styles.notifTop}>
                  <Text style={[styles.notifTitle, { color: colors.dashboard.textSecondary }, !notif.read && { color: colors.dashboard.textPrimary, fontWeight: '700' }]}>
                    {notif.title}
                  </Text>
                  <Text style={[styles.notifTime, { color: colors.dashboard.textSecondary }]}>{notif.time}</Text>
                </View>
                <Text style={[styles.notifDesc, { color: colors.dashboard.textSecondary }]}>{notif.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 20,
  },
  notifRow: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    position: "relative",
  },
  notifUnread: {
    backgroundColor: "#F0FDF4",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: "absolute",
    top: 14,
    left: 14,
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
    fontWeight: "600",
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
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
  },
});
