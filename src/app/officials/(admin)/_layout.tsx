import { RoleTabLayout, type TabRoute } from '@/features/officials/shared/components/role-tab-layout';

const routes: TabRoute[] = [
  { name: 'index', title: 'Home', icon: 'grid-outline' },
  { name: 'users', title: 'Users', icon: 'people-outline' },
  { name: 'reports', title: 'Reports', icon: 'bar-chart-outline', showHeader: true },
  { name: 'audit-logs', title: 'Audit Logs', icon: 'document-lock-outline', showHeader: true },
  { name: 'settings', title: 'Settings', icon: 'settings-outline' },
];

export default function AdminTabLayout() {
  return <RoleTabLayout routes={routes} />;
}
