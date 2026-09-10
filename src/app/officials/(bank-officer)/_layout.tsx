import { Redirect } from 'expo-router';

import { getRouteForRole, useAuth } from '@/contexts/AuthContext';
import { RoleTabLayout, type TabRoute } from '@/features/officials/shared/components/role-tab-layout';

const routes: TabRoute[] = [
  { name: 'index', title: 'Home', icon: 'grid-outline' },
  { name: 'loans', title: 'Loans', icon: 'cash-outline' },
  { name: 'approvals', title: 'Approvals', icon: 'checkmark-circle-outline', showHeader: true },
  { name: 'settings', title: 'Settings', icon: 'settings-outline' },
];

export default function BankOfficerTabLayout() {
  const { isBootstrapping, isLoggedIn, user } = useAuth();

  if (isBootstrapping) return null;
  if (!isLoggedIn || !user) {
    return <Redirect href={'/officials/login' as any} />;
  }
  // A signed-in official who is not a bank officer must not see this group's
  // tabs — send them to their own role home instead.
  if (user.role !== 'bank-officer') {
    return <Redirect href={getRouteForRole(user.role)} />;
  }

  return <RoleTabLayout routes={routes} />;
}
