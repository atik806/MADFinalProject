import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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
  addNotification: (notif: Omit<Notification, 'id' | 'time' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    icon: 'checkmark-circle',
    color: '#16A34A',
    title: 'Loan Approved!',
    time: '2h ago',
    description: 'Your application L-2024-004 for ৳60,000 has been approved by Sonali Bank.',
    read: false,
  },
  {
    id: '2',
    icon: 'trending-up',
    color: '#2563EB',
    title: 'Credit Score Updated',
    time: '1d ago',
    description: 'Your score increased from 710 to 720. Great financial discipline!',
    read: false,
  },
  {
    id: '3',
    icon: 'shield-checkmark',
    color: '#7C3AED',
    title: 'Profile Verified',
    time: '3d ago',
    description: 'Your farm details have been verified by Field Officer Khorshed Alam.',
    read: true,
  },
  {
    id: '4',
    icon: 'document-text',
    color: '#F59E0B',
    title: 'Document Required',
    time: '5d ago',
    description: 'Please upload your land deed to complete your loan application.',
    read: true,
  },
];

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(DEFAULT_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback(
    (notif: Omit<Notification, 'id' | 'time' | 'read'>) => {
      const newNotif: Notification = {
        ...notif,
        id: Date.now().toString(),
        time: 'Just now',
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);
    },
    [],
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
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
