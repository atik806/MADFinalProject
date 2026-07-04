import { SettingsView } from '@/features/officials/shared/components/settings-view';
import { useThemeContext } from '@/contexts/ThemeContext';

export default function AdminSettingsScreen() {
  const { isDark, toggleTheme } = useThemeContext();

  return (
    <SettingsView
      sections={[
        {
          title: 'General',
          items: [
            { icon: 'globe-outline', label: 'Language', value: 'English' },
            { icon: 'moon-outline', label: 'Dark Mode', type: 'switch', value: isDark, onSwitchChange: toggleTheme },
          ],
        },
        {
          title: 'Notifications',
          items: [
            { icon: 'notifications-outline', label: 'Push Notifications', type: 'switch', value: true },
            { icon: 'mail-outline', label: 'Email Alerts', type: 'switch', value: false },
          ],
        },
        {
          title: 'Security',
          items: [
            { icon: 'lock-closed-outline', label: 'Two-Factor Auth', type: 'switch', value: false },
            { icon: 'key-outline', label: 'Change Password' },
          ],
        },
        {
          title: 'About',
          items: [
            { icon: 'information-circle-outline', label: 'Version', value: '1.0.0' },
            { icon: 'document-text-outline', label: 'Terms of Service' },
            { icon: 'shield-checkmark-outline', label: 'Privacy Policy' },
          ],
        },
      ]}
    />
  );
}
