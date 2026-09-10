import { Redirect } from 'expo-router';

import { getRouteForRole, useAuth } from '@/contexts/AuthContext';
import { RoleTabLayout, type TabRoute } from '@/features/officials/shared/components/role-tab-layout';

const routes: TabRoute[] = [
  { name: 'index', title: 'Home', icon: 'grid-outline' },
  { name: 'applications', title: 'Applications', icon: 'document-text-outline' },
  { name: 'visits', title: 'Visits', icon: 'location-outline', showHeader: true },
  { name: 'settings', title: 'Settings', icon: 'settings-outline' },
];

export default function FieldOfficerTabLayout() {
  const { isBootstrapping, isLoggedIn, user } = useAuth();

  if (isBootstrapping) return null;
  if (!isLoggedIn || !user) {
    return <Redirect href={'/officials/login' as any} />;
  }
  // A signed-in official who is not a field officer must not see this group's
  // tabs — send them to their own role home instead.
  if (user.role !== 'field-officer') {
    return <Redirect href={getRouteForRole(user.role)} />;
  }

  return <RoleTabLayout routes={routes} />;
}
