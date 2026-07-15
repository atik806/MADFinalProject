import { SettingsView } from '@/features/officials/shared/components/settings-view';
import { useThemeContext } from '@/contexts/ThemeContext';
import { FIELD_OFFICER_SETTINGS } from '@/data';

export default function FieldOfficerSettingsScreen() {
  const { isDark, toggleTheme } = useThemeContext();

  const sections = FIELD_OFFICER_SETTINGS.map((section) => ({
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
