import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/features/officials/shared/constants/theme';
import { contentMaxWidth } from '@/features/officials/shared/constants/layout';
import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { SettingsRow, settingsCardStyles } from '@/features/officials/shared/components/settings-row';
import { LogoutButton } from '@/features/officials/shared/components/logout-button';
import { useAuth } from '@/contexts/AuthContext';

type SettingsItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | boolean;
  type?: 'switch';
};

type SettingsSection = {
  title: string;
  items: SettingsItem[];
};

type SettingsViewProps = {
  sections: SettingsSection[];
};

export function SettingsView({ sections }: SettingsViewProps) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace('/view/login');
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Settings" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {sections.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            <View style={settingsCardStyles.card}>
              {section.items.map((item, ii) => (
                <View key={ii}>
                  <SettingsRow
                    icon={item.icon}
                    label={item.label}
                    value={item.type === 'switch' ? undefined : (item.value as string | undefined)}
                    showSwitch={item.type === 'switch'}
                    switchValue={item.type === 'switch' ? Boolean(item.value) : undefined}
                  />
                  {ii < section.items.length - 1 && <View style={settingsCardStyles.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        <LogoutButton onPress={handleLogout} />
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.dashboard.bg,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.dashboard.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
});
