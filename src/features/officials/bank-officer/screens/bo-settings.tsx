import { SettingsView } from '@/features/officials/shared/components/settings-view';

export default function BankOfficerSettingsScreen() {
  return (
    <SettingsView
      sections={[
        {
          title: 'General',
          items: [
            { icon: 'globe-outline', label: 'Language', value: 'English' },
            { icon: 'moon-outline', label: 'Dark Mode', type: 'switch', value: false },
          ],
        },
        {
          title: 'Notifications',
          items: [
            { icon: 'notifications-outline', label: 'Push Notifications', type: 'switch', value: true },
            { icon: 'mail-outline', label: 'Email Alerts', type: 'switch', value: true },
          ],
        },
        {
          title: 'Security',
          items: [
            { icon: 'lock-closed-outline', label: 'Change Password' },
          ],
        },
        {
          title: 'About',
          items: [
            { icon: 'information-circle-outline', label: 'Version', value: '1.0.0' },
            { icon: 'document-text-outline', label: 'Terms of Service' },
          ],
        },
      ]}
    />
  );
}
