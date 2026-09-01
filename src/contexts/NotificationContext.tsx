import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';

export type Notification = {
  id: string;
  icon: string;
  color: string;
  title: string;
  time: string;
  description: string;
  read: boolean;
};

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  addNotification: (notif: Omit<Notification, 'id' | 'time' | 'read'>) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

// Heuristic icon/color per notification title, matching the visual language
// the mock data used (green success, blue info, amber warning, violet verify).
const iconFor = (title: string): { icon: string; color: string } => {
  const t = title.toLowerCase();
  if (/approv/.test(t)) return { icon: 'checkmark-circle', color: '#16A34A' };
  if (/reject/.test(t)) return { icon: 'close-circle', color: '#DC2626' };
  if (/credit score/.test(t)) return { icon: 'trending-up', color: '#2563EB' };
  if (/verif/.test(t)) return { icon: 'shield-checkmark', color: '#7C3AED' };
  if (/document|upload/.test(t)) return { icon: 'document-text', color: '#F59E0B' };
  if (/review/.test(t)) return { icon: 'eye', color: '#2563EB' };
  return { icon: 'notifications', color: '#2563EB' };
};

const timeAgo = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const mapNotification = (row: any): Notification => {
  const { icon, color } = iconFor(String(row.title ?? ''));
  return {
    id: String(row.id),
    icon,
    color,
    title: row.title ?? '',
    time: timeAgo(String(row.created_at ?? '')),
    description: row.description ?? '',
    read: Boolean(row.read),
  };
};

const errorMessage = (err: unknown): string =>
  err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';

// The backend notifications controller returns { notifications, success }
// (a legacy bare shape, documented in AI_README) — not the shared
// { success, message, data } contract — so both shapes are accepted here.
const rowsFromResponse = (res: any): any[] =>
  Array.isArray(res?.notifications) ? res.notifications : Array.isArray(res?.data) ? res.data : [];

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshNotifications = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<any>('/api/farmer/notifications');
      setNotifications(rowsFromResponse(res).map(mapNotification));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Local-only: used by flows that want immediate UI feedback (e.g. after
  // submitting an application); the server sends its own notification anyway,
  // and refreshNotifications reconciles with the truth.
  const addNotification = useCallback(
    (notif: Omit<Notification, 'id' | 'time' | 'read'>) => {
      const newNotif: Notification = {
        ...notif,
        id: `local-${Date.now()}`,
        time: 'Just now',
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);
    },
    [],
  );

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await api.put(`/api/farmer/notifications/${id}/read`, {});
    } catch {
      // Optimistic update stands; the unread badge self-corrects on next refresh.
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await Promise.all(
      unreadIds.map((id) => api.put(`/api/farmer/notifications/${id}/read`, {}).catch(() => null)),
    );
  }, [notifications]);

  const clearNotifications = useCallback(async () => {
    const snapshot = notifications;
    setNotifications([]);
    try {
      await Promise.all(snapshot.map((n) => api.del(`/api/farmer/notifications/${n.id}`).catch(() => null)));
    } catch {
      // Best effort: refresh restores the server truth.
    }
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
