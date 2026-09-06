import { useEffect, useState } from 'react';

import { SettingsView } from '@/features/officials/shared/components/settings-view';
import { useThemeContext } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import type { ApiResponse, BankOfficerProfileRow } from '@/lib/api-types';

type ProfileItem = {
  icon: 'person-outline' | 'business-outline' | 'briefcase-outline' | 'id-card-outline' | 'mail-outline' | 'call-outline';
  label: string;
  value: string;
};

export default function BankOfficerSettingsScreen() {
  const { isDark, toggleTheme } = useThemeContext();
  const [officer, setOfficer] = useState<BankOfficerProfileRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get<ApiResponse<BankOfficerProfileRow>>('/api/bank-officer/profile/me');
        if (!cancelled) setOfficer(res?.data ?? null);
      } catch {
        // Profile is cosmetic in settings; the dashboard already surfaces it.
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const profileItems: ProfileItem[] = [];
  if (officer) {
    profileItems.push({ icon: 'person-outline', label: 'Name', value: officer.name_en ?? officer.name_bn ?? '—' });
    const posting = [officer.bank_name, officer.branch_name, officer.branch_code].filter(Boolean).join(' • ');
    if (posting) profileItems.push({ icon: 'business-outline', label: 'Posting', value: posting });
    if (officer.designation) profileItems.push({ icon: 'briefcase-outline', label: 'Designation', value: officer.designation });
    if (officer.employee_id) profileItems.push({ icon: 'id-card-outline', label: 'Employee ID', value: officer.employee_id });
    if (officer.email) profileItems.push({ icon: 'mail-outline', label: 'Email', value: officer.email });
    if (officer.phone) profileItems.push({ icon: 'call-outline', label: 'Phone', value: officer.phone });
  }

  return (
    <SettingsView
      sections={[
        ...(profileItems.length > 0
          ? [
              {
                title: 'My Profile',
                items: profileItems.map((item) => ({ icon: item.icon, label: item.label, value: item.value })),
              },
            ]
          : []),
        {
          title: 'General',
          items: [
            { icon: 'globe-outline' as const, label: 'Language', value: 'English' },
            { icon: 'moon-outline' as const, label: 'Dark Mode', type: 'switch', value: isDark, onSwitchChange: toggleTheme },
          ],
        },
        {
          title: 'Notifications',
          items: [
            { icon: 'notifications-outline' as const, label: 'Push Notifications', type: 'switch', value: true },
            { icon: 'mail-outline' as const, label: 'Email Alerts', type: 'switch', value: true },
          ],
        },
        {
          title: 'Security',
          items: [
            { icon: 'lock-closed-outline' as const, label: 'Change Password' },
          ],
        },
        {
          title: 'About',
          items: [
            { icon: 'information-circle-outline' as const, label: 'Version', value: '1.0.0' },
            { icon: 'document-text-outline' as const, label: 'Terms of Service' },
          ],
        },
      ]}
    />
  );
}