import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { api } from '@/config/api';

export type Notification = {
  id: string;
  icon: string;
  color: string;
  title: string;
  time: string;
  description: string;
  read: boolean;
};

const formatTime = (value?: string): string => {
  if (!value) return 'Just now';
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'Just now';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const mapNotification = (n: any): Notification => ({
  id: n.id,
  icon: 'notifications-outline',
  color: '#157A5A',
  title: n.title ?? '',
  time: formatTime(n.created_at),
  description: n.description ?? '',
  read: Boolean(n.read),
});

type NotificationContextType = {
  notifications: Notification[];
  loading: boolean;
  unreadCount: number;
  addNotification: (notif: Omit<Notification, 'id' | 'time' | 'read'>) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => void;
  refresh: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (user?.role !== 'farmer') return;
    try {
      setLoading(true);
      const res = await api.get<{ notifications: any[] }>('/api/farmer/notifications');
      setNotifications((res.notifications ?? []).map(mapNotification));
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addNotification = useCallback((notif: Omit<Notification, 'id' | 'time' | 'read'>) => {
    setNotifications((prev) => [{ ...notif, id: Date.now().toString(), time: 'Just now', read: false }, ...prev]);
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await api.put(`/api/farmer/notifications/${id}/read`, {});
    } catch {
      // ignore
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => api.put(`/api/farmer/notifications/${n.id}/read`, {}).catch(() => {})));
  }, [notifications]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, loading, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotifications, refresh }}
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
