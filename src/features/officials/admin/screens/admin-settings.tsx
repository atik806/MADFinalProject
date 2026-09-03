import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { LogoutButton } from '@/features/officials/shared/components/logout-button';
import { settingsCardStyles } from '@/features/officials/shared/components/settings-row';
import { useColors } from '@/features/officials/shared/constants/theme';
import { contentMaxWidth } from '@/features/officials/shared/constants/layout';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { changeAdminPassword } from '@/features/officials/admin/services/admin-api';

function Row({
  icon,
  label,
  value,
  onPress,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const colors = useColors();
  const content = (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={20} color={colors.dashboard.textPrimary} />
        <Text style={[styles.rowLabel, { color: colors.dashboard.textPrimary }]}>{label}</Text>
      </View>
      {right ?? (
        <View style={styles.rowRight}>
          {value ? <Text style={[styles.rowValue, { color: colors.dashboard.textSecondary }]}>{value}</Text> : null}
          {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.dashboard.textSecondary} /> : null}
        </View>
      )}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.6 }}>
        {content}
      </Pressable>
    );
  }
  return content;
}

function Card({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[settingsCardStyles.card, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
      {children}
    </View>
  );
}

function Divider() {
  const colors = useColors();
  return <View style={[settingsCardStyles.divider, { backgroundColor: colors.dashboard.border }]} />;
}

export default function AdminSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useThemeContext();
  const { lang, toggleLang } = useLanguage();

  const [pwOpen, setPwOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    router.replace('/view/login');
  };

  const submitPassword = async () => {
    setErr(null);
    if (!current || !next) return setErr('Enter your current and new password.');
    if (next.length < 6) return setErr('New password must be at least 6 characters.');
    if (next !== confirm) return setErr('New passwords do not match.');
    setSubmitting(true);
    try {
      await changeAdminPassword(current, next);
      setPwOpen(false);
      setCurrent('');
      setNext('');
      setConfirm('');
      Alert.alert('Password changed', 'Your admin password has been updated.');
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.dashboard.bg }]}>
      <ScreenHeader title="Settings" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, { color: colors.dashboard.textSecondary }]}>Account</Text>
        <Card>
          <Row icon="person-circle-outline" label="Signed in as" value={user?.email ?? user?.name ?? 'Administrator'} />
          <Divider />
          <Row icon="lock-closed-outline" label="Change Password" onPress={() => setPwOpen(true)} />
        </Card>

        <Text style={[styles.sectionLabel, { color: colors.dashboard.textSecondary }]}>General</Text>
        <Card>
          <Row
            icon="globe-outline"
            label="Language"
            right={
              <Pressable onPress={toggleLang} style={[styles.langPill, { borderColor: colors.dashboard.border }]}>
                <Text style={[styles.langPillText, { color: colors.dashboard.textPrimary }]}>{lang === 'en' ? 'English' : 'বাংলা'}</Text>
              </Pressable>
            }
          />
          <Divider />
          <Row
            icon="moon-outline"
            label="Dark Mode"
            right={
              <Switch
                trackColor={{ false: colors.dashboard.border, true: colors.greenLight + '60' }}
                thumbColor={colors.greenLight}
                value={isDark}
                onValueChange={toggleTheme}
              />
            }
          />
        </Card>

        <Text style={[styles.sectionLabel, { color: colors.dashboard.textSecondary }]}>About</Text>
        <Card>
          <Row icon="information-circle-outline" label="Version" value="1.0.0" />
        </Card>

        <View style={{ height: 20 }} />
        <LogoutButton onPress={handleLogout} />
        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal visible={pwOpen} transparent animationType="fade" onRequestClose={() => setPwOpen(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.overlay} onPress={() => setPwOpen(false)}>
            <Pressable style={[styles.modalCard, { backgroundColor: colors.dashboard.cardBg }]} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.dashboard.textPrimary }]}>Change Password</Text>
                <Pressable onPress={() => setPwOpen(false)}>
                  <Ionicons name="close" size={22} color={colors.dashboard.textSecondary} />
                </Pressable>
              </View>

              {(['current', 'next', 'confirm'] as const).map((f) => (
                <TextInput
                  key={f}
                  style={[styles.input, { color: colors.dashboard.textPrimary, backgroundColor: colors.dashboard.bg, borderColor: colors.dashboard.border }]}
                  placeholder={f === 'current' ? 'Current password' : f === 'next' ? 'New password' : 'Confirm new password'}
                  placeholderTextColor={colors.dashboard.textSecondary}
                  secureTextEntry
                  value={f === 'current' ? current : f === 'next' ? next : confirm}
                  onChangeText={f === 'current' ? setCurrent : f === 'next' ? setNext : setConfirm}
                />
              ))}

              {err ? <Text style={[styles.errText, { color: colors.dashboard.redDown }]}>{err}</Text> : null}

              <Pressable
                onPress={submitPassword}
                disabled={submitting}
                style={[styles.submitBtn, { backgroundColor: colors.deepGreen }, submitting && { opacity: 0.7 }]}>
                {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Update password</Text>}
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 16, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '500' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 14, fontWeight: '500', flexShrink: 1 },
  langPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  langPillText: { fontSize: 13, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 440, borderRadius: 20, padding: 22 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 10 },
  errText: { fontSize: 12, marginBottom: 6, marginTop: 2 },
  submitBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
