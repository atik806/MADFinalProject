import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useColors } from '../../../features/officials/shared/constants/theme';
import { useThemeContext } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { FARMER_SETTINGS } from '@/data';

type SettingItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  type?: 'toggle' | 'navigate' | 'action';
  value?: boolean | string;
  onPress?: () => void;
  onToggle?: (val: boolean) => void;
  subtitle?: string;
};

type SettingSection = {
  title: string;
  items: SettingItem[];
};

export default function FarmerSettingsScreen() {
  const colors = useColors();
  const { isDark, toggleTheme } = useThemeContext();
  const { logout } = useAuth();
  const [notifications, setNotifications] = useState(true);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => { logout(); router.replace('/'); } },
    ]);
  };

  const sections: SettingSection[] = FARMER_SETTINGS.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (item.label === 'Edit Profile') {
        return { ...item, type: 'navigate' as const, onPress: () => router.push('/view/Profile/profile') };
      }
      if (item.label === 'Change Password') {
        return { ...item, type: 'action' as const, onPress: () => Alert.alert('Coming Soon', 'Change password feature will be available soon.') };
      }
      if (item.label === 'Dark Mode') {
        return { ...item, type: 'toggle' as const, value: isDark, onToggle: toggleTheme };
      }
      if (item.label === 'Notifications') {
        return { ...item, type: 'toggle' as const, value: notifications, onToggle: setNotifications };
      }
      if (item.label === 'Language') {
        return { ...item, type: 'navigate' as const, onPress: () => Alert.alert('Coming Soon', 'Language selection coming soon.') };
      }
      if (item.label === 'Version') {
        return { ...item, type: 'navigate' as const, onPress: () => {} };
      }
      if (item.label === 'Privacy Policy') {
        return { ...item, type: 'action' as const, onPress: () => Alert.alert('Privacy Policy', 'Coming soon.') };
      }
      if (item.label === 'Terms of Service') {
        return { ...item, type: 'action' as const, onPress: () => Alert.alert('Terms of Service', 'Coming soon.') };
      }
      return { ...item, type: 'action' as const, onPress: () => {} };
    }),
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.dashboard.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.dashboard.cardBg, borderBottomColor: colors.dashboard.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.dashboard.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.dashboard.textPrimary }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {sections.map((section, si) => (
          <View key={si} style={{ marginBottom: 24 }}>
            <Text style={[styles.sectionTitle, { color: colors.dashboard.textSecondary }]}>{section.title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.dashboard.cardBg }]}>
              {section.items.map((item, ii) => (
                <Pressable
                  key={ii}
                  onPress={item.onPress}
                  disabled={item.type === 'toggle'}
                  style={({ pressed }) => [
                    styles.settingRow,
                    ii < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.dashboard.border },
                    pressed && item.type !== 'toggle' && styles.settingPressed,
                  ]}>
                  <View style={[styles.settingIcon, { backgroundColor: colors.deepGreen + '15' }]}>
                    <Ionicons name={item.icon} size={20} color={colors.deepGreen} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: colors.dashboard.textPrimary }]}>{item.label}</Text>
                    {item.subtitle && (
                      <Text style={[styles.settingSubtitle, { color: colors.dashboard.textSecondary }]}>{item.subtitle}</Text>
                    )}
                  </View>
                  {item.type === 'toggle' ? (
                    <Switch
                      value={item.value as boolean}
                      onValueChange={item.onToggle}
                      trackColor={{ false: colors.dashboard.border, true: colors.greenLight }}
                      thumbColor="#FFFFFF"
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.dashboard.textSecondary} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          onPress={handleLogout}
          style={[styles.logoutBtn, { backgroundColor: colors.userRejected, borderColor: colors.userRejected }]}>
          <Ionicons name="log-out-outline" size={20} color={colors.dashboard.redDown} />
          <Text style={[styles.logoutText, { color: colors.dashboard.redDown }]}>Logout</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  settingPressed: {
    opacity: 0.7,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
