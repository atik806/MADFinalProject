import { useCallback, useEffect, useState } from 'react';

import { SettingsView } from '@/features/officials/shared/components/settings-view';
import { useThemeContext } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import type { ApiResponse, BankOfficerProfileRow } from '@/lib/api-types';

type ProfileItem = {
  icon: 'person-outline' | 'business-outline' | 'briefcase-outline' | 'id-card-outline' | 'mail-outline' | 'call-outline';
  label: string;
  value: string;
};

type ProfileState = 'loading' | 'ready' | 'error';

export default function BankOfficerSettingsScreen() {
  const { isDark, toggleTheme } = useThemeContext();
  const [officer, setOfficer] = useState<BankOfficerProfileRow | null>(null);
  const [profileState, setProfileState] = useState<ProfileState>('loading');

  const loadProfile = useCallback(async () => {
    setProfileState('loading');
    try {
      const res = await api.get<ApiResponse<BankOfficerProfileRow>>('/api/bank-officer/profile/me');
      setOfficer(res?.data ?? null);
      setProfileState('ready');
    } catch {
      setOfficer(null);
      setProfileState('error');
    }
  }, []);

  useEffect(() => {
    // Kickoff deferred out of the effect body (repo lint rule); state
    // updates happen only after the fetch resolves.
    const timer = setTimeout(() => void loadProfile(), 0);
    return () => clearTimeout(timer);
  }, [loadProfile]);

  const profileItems: ProfileItem[] = [];
  if (officer && profileState === 'ready') {
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
        {
          title: 'My Profile',
          items:
            profileState === 'loading'
              ? [{ icon: 'hourglass-outline' as const, label: 'Loading profile…' }]
              : profileState === 'error'
                ? [{ icon: 'alert-circle-outline' as const, label: 'Profile could not be loaded', value: 'Tap to retry', onPress: () => void loadProfile() }]
                : profileItems.map((item) => ({ icon: item.icon, label: item.label, value: item.value })),
        },
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