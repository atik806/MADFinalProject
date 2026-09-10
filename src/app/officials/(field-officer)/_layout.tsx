import { Redirect } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { RoleTabLayout, type TabRoute } from '@/features/officials/shared/components/role-tab-layout';

const routes: TabRoute[] = [
  { name: 'index', title: 'Home', icon: 'grid-outline' },
  { name: 'applications', title: 'Applications', icon: 'document-text-outline' },
  { name: 'visits', title: 'Visits', icon: 'location-outline', showHeader: true },
  { name: 'settings', title: 'Settings', icon: 'settings-outline' },
];

export default function FieldOfficerTabLayout() {
  const { isLoggedIn, user } = useAuth();

  if (!isLoggedIn || user?.role !== 'field-officer') {
    return <Redirect href={'/officials/login' as any} />;
  }

  return <RoleTabLayout routes={routes} />;
}
