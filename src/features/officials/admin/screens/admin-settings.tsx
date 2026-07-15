import { SettingsView } from '@/features/officials/shared/components/settings-view';
import { useThemeContext } from '@/contexts/ThemeContext';
import { ADMIN_SETTINGS } from '@/data';

export default function AdminSettingsScreen() {
  const { isDark, toggleTheme } = useThemeContext();

  const sections = ADMIN_SETTINGS.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.label === 'Dark Mode'
        ? { ...item, type: 'switch' as const, onSwitchChange: toggleTheme, value: isDark }
        : item,
    ),
  }));

  return (
    <SettingsView sections={sections} />
  );
}
