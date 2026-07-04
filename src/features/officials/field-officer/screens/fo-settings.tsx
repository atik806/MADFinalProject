import { SettingsView } from '@/features/officials/shared/components/settings-view';

export default function FieldOfficerSettingsScreen() {
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
          title: 'Field Work',
          items: [
            { icon: 'map-outline', label: 'Offline Maps', type: 'switch', value: true },
            { icon: 'sync-outline', label: 'Auto Sync Data', type: 'switch', value: true },
            { icon: 'download-outline', label: 'Downloaded Forms', value: '4 forms' },
            { icon: 'save-outline', label: 'Offline Reports', type: 'switch', value: false },
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
            { icon: 'finger-print-outline', label: 'Biometric Auth', type: 'switch', value: false },
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
