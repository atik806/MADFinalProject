import { RoleTabLayout, type TabRoute } from '@/features/officials/shared/components/role-tab-layout';

const routes: TabRoute[] = [
  { name: 'index', title: 'Home', icon: 'grid-outline' },
  { name: 'loans', title: 'Loans', icon: 'cash-outline' },
  { name: 'approvals', title: 'Approvals', icon: 'checkmark-circle-outline', showHeader: true },
  { name: 'settings', title: 'Settings', icon: 'settings-outline' },
];

export default function BankOfficerTabLayout() {
  return <RoleTabLayout routes={routes} />;
}
