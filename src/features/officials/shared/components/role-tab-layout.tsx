import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { BrandColors } from '@/features/officials/shared/constants/theme';

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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BrandColors.greenLight,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
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
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTitleStyle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
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
