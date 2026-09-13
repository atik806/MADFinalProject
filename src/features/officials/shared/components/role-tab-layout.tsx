import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/features/officials/shared/constants/theme';

export type TabRoute = {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  showHeader?: boolean;
  // Shorter label for the tab bar itself, when `title` (used for the header
  // too) is too long to fit without wrapping/clipping — e.g. "Audit Logs" -> "Audit".
  tabBarLabel?: string;
};

type RoleTabLayoutProps = {
  routes: TabRoute[];
};

export function RoleTabLayout({ routes }: RoleTabLayoutProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const barHeight = 54 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.greenLight,
        tabBarInactiveTintColor: colors.dashboard.textSecondary,
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600' },
        tabBarItemStyle: { paddingVertical: 4 },
        tabBarAllowFontScaling: false,
        tabBarStyle: {
          backgroundColor: colors.dashboard.cardBg,
          borderTopWidth: 1,
          borderTopColor: colors.dashboard.border,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          height: barHeight,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
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
            tabBarLabel: route.tabBarLabel ?? route.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={route.icon} size={size - 2} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
