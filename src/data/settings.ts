import { Ionicons } from '@expo/vector-icons';

export type SettingItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  value?: string | boolean;
  route?: string;
};

export type SettingSection = {
  title: string;
  items: SettingItem[];
};

export const ADMIN_SETTINGS: SettingSection[] = [
  {
    title: 'General',
    items: [
      { icon: 'globe-outline', label: 'Language', subtitle: 'English', value: 'en' },
      { icon: 'moon-outline', label: 'Dark Mode', value: false },
    ],
  },
  {
    title: 'System',
    items: [
      { icon: 'notifications-outline', label: 'Notifications', subtitle: 'Push, Email' },
      { icon: 'shield-checkmark-outline', label: 'Security', subtitle: '2FA enabled' },
    ],
  },
  {
    title: 'About',
    items: [
      { icon: 'information-circle-outline', label: 'Version', subtitle: '1.0.0' },
      { icon: 'document-text-outline', label: 'Terms of Service' },
      { icon: 'lock-closed-outline', label: 'Privacy Policy' },
    ],
  },
];

export const BANK_OFFICER_SETTINGS: SettingSection[] = [
  {
    title: 'General',
    items: [
      { icon: 'globe-outline', label: 'Language', subtitle: 'English', value: 'en' },
      { icon: 'moon-outline', label: 'Dark Mode', value: false },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: 'notifications-outline', label: 'Notifications', subtitle: 'Push, Email' },
      { icon: 'shield-checkmark-outline', label: 'Security', subtitle: '2FA enabled' },
    ],
  },
  {
    title: 'About',
    items: [
      { icon: 'information-circle-outline', label: 'Version', subtitle: '1.0.0' },
      { icon: 'document-text-outline', label: 'Terms of Service' },
    ],
  },
];

export const FIELD_OFFICER_SETTINGS: SettingSection[] = [
  {
    title: 'General',
    items: [
      { icon: 'globe-outline', label: 'Language', subtitle: 'English', value: 'en' },
      { icon: 'moon-outline', label: 'Dark Mode', value: false },
    ],
  },
  {
    title: 'Field Work',
    items: [
      { icon: 'map-outline', label: 'Offline Maps', subtitle: 'Bhola district' },
      { icon: 'sync-outline', label: 'Auto Sync', subtitle: 'Every 30 min' },
    ],
  },
  {
    title: 'Notifications',
    items: [
      { icon: 'notifications-outline', label: 'Push Notifications' },
      { icon: 'mail-outline', label: 'Email Reports' },
    ],
  },
  {
    title: 'Security',
    items: [
      { icon: 'shield-checkmark-outline', label: 'Security', subtitle: '2FA enabled' },
    ],
  },
  {
    title: 'About',
    items: [
      { icon: 'information-circle-outline', label: 'Version', subtitle: '1.0.0' },
    ],
  },
];

export const FARMER_SETTINGS: SettingSection[] = [
  {
    title: 'Account',
    items: [
      { icon: 'person-outline', label: 'Edit Profile', route: '/view/Profile/edit-profile' },
      { icon: 'lock-closed-outline', label: 'Change Password' },
      { icon: 'language-outline', label: 'Language', subtitle: 'English', value: 'en' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: 'moon-outline', label: 'Dark Mode', value: false },
      { icon: 'notifications-outline', label: 'Notifications', value: true },
    ],
  },
  {
    title: 'About',
    items: [
      { icon: 'information-circle-outline', label: 'Version', subtitle: '1.0.0' },
      { icon: 'document-text-outline', label: 'Terms of Service' },
      { icon: 'lock-closed-outline', label: 'Privacy Policy' },
    ],
  },
];
