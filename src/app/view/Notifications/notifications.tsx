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

export default function NotificationsScreen() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } =
    useNotifications();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      {notifications.length > 0 && (
        <View style={styles.actions}>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.actionBtn} onPress={markAllAsRead}>
              <Ionicons name="checkmark-done" size={16} color="#006847" />
              <Text style={styles.actionText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={clearNotifications}>
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
            <Text style={[styles.actionText, { color: "#DC2626" }]}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyDesc}>You're all caught up!</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {notifications.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              style={[styles.notifRow, !notif.read && styles.notifUnread]}
              onPress={() => markAsRead(notif.id)}
              activeOpacity={0.7}
            >
              {!notif.read && <View style={styles.unreadDot} />}
              <View style={[styles.notifIcon, { backgroundColor: `${notif.color}18` }]}>
                <Ionicons name={notif.icon as any} size={18} color={notif.color} />
              </View>
              <View style={styles.notifContent}>
                <View style={styles.notifTop}>
                  <Text style={[styles.notifTitle, !notif.read && styles.notifTitleUnread]}>
                    {notif.title}
                  </Text>
                  <Text style={styles.notifTime}>{notif.time}</Text>
                </View>
                <Text style={styles.notifDesc}>{notif.description}</Text>
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
    backgroundColor: "#F7F8F8",
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    color: "#006847",
    fontSize: 13,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 20,
  },
  notifRow: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    position: "relative",
  },
  notifUnread: {
    backgroundColor: "#F0FDF4",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#006847",
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
    color: "#4B5563",
    fontSize: 14,
    flex: 1,
  },
  notifTitleUnread: {
    fontWeight: "700",
    color: "#1F2937",
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
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B7280",
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: "#9CA3AF",
  },
});
