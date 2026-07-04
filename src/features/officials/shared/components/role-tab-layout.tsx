import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useColors } from '@/features/officials/shared/constants/theme';

export type TabRoute = {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  showHeader?: boolean;
};

type RoleTabLayoutProps = {
  routes: TabRoute[];
};

export function RoleTabLayout({ routes }: RoleTabLayoutProps) {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.greenLight,
        tabBarInactiveTintColor: colors.dashboard.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.dashboard.cardBg,
          borderTopWidth: 1,
          borderTopColor: colors.dashboard.border,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
      }}>
      {routes.map((route) => (
        <Tabs.Screen
          key={route.name}
          name={route.name}
          options={{
            title: route.title,
            headerShown: route.showHeader ?? false,
            headerTitleAlign: 'center',
            headerStyle: { backgroundColor: colors.dashboard.cardBg },
            headerTitleStyle: { fontSize: 17, fontWeight: '700', color: colors.dashboard.textPrimary },
            headerShadowVisible: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={route.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
