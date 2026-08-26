import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getRouteForRole, useAuth } from '../contexts/AuthContext';
import { useColors } from '../features/officials/shared/constants/theme';
import { useTranslation } from '../hooks/use-translation';

export default function LandingPage() {
  const { t, lang, toggleLang } = useTranslation();
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const colors = useColors();

  // A restored session skips the landing page and goes straight to the
  // role-appropriate dashboard.
  if (isLoggedIn && user) {
    return <Redirect href={getRouteForRole(user.role)} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.deepGreen }]}>
      <View style={styles.bgGlowTop} pointerEvents="none" />
      <View style={styles.bgGlowBottom} pointerEvents="none" />

      <View style={styles.langRow}>
        <View />
        <TouchableOpacity onPress={toggleLang} hitSlop={8} style={styles.langBtn}>
          <Text style={styles.langText}>{lang === 'en' ? 'বাং' : 'EN'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Ionicons name="sparkles-outline" size={14} color="#D1FAE5" />
            <Text style={styles.badgeText}>Digital Agriculture Finance</Text>
          </View>

          <View style={styles.logoBox}>
            <Ionicons name="leaf" size={40} color="#fff" />
          </View>

          <Text style={styles.title}>SOFOL</Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>

          <Text style={styles.description}>
            {t('landingDesc')}
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.featureRow}>
            <View style={styles.featureIconWrap}>
              <Ionicons name="analytics-outline" size={18} color="#ECFDF5" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{t('creditProfile')}</Text>
              <Text style={styles.featureDesc}>{t('creditProfileDesc')}</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureIconWrap}>
              <Ionicons name="leaf-outline" size={18} color="#ECFDF5" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{t('agriSupport')}</Text>
              <Text style={styles.featureDesc}>{t('agriSupportDesc')}</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#ECFDF5" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{t('secureTransparent')}</Text>
              <Text style={styles.featureDesc}>{t('secureTransparentDesc')}</Text>
            </View>
          </View>
        </View>

        <Pressable style={styles.getStartedBtn} onPress={() => router.push('/view/login')}>
          <Text style={styles.getStartedText}>{t('getStarted')}</Text>
          <Ionicons name="arrow-forward" size={18} color="#065F46" />
        </Pressable>

        <Pressable style={styles.signInBtn} onPress={() => router.push('/view/login')}>
          <Text style={styles.signInText}>{t('alreadyRegistered')}</Text>
          <Ionicons name="log-in-outline" size={16} color="#D1FAE5" />
        </Pressable>

        <Text style={styles.footerNote}>Built for farmers, field officers, and lending partners.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#047857',
  },
  bgGlowTop: {
    position: 'absolute',
    top: -120,
    right: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.11)',
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: -140,
    left: -110,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(4,120,87,0.55)',
  },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingTop: 12,
    zIndex: 3,
  },
  langBtn: {
    minWidth: 40,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  langText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 44,
    paddingBottom: 28,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginBottom: 16,
  },
  badgeText: {
    color: '#DCFCE7',
    fontSize: 12,
    fontWeight: '600',
  },
  logoBox: {
    width: 94,
    height: 94,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1.6,
  },
  tagline: {
    color: '#ECFDF5',
    fontSize: 17,
    fontWeight: '600',
    marginTop: 10,
  },
  description: {
    color: '#D1FAE5',
    fontSize: 14.5,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 23,
    paddingHorizontal: 6,
  },
  features: {
    backgroundColor: 'rgba(3,84,62,0.55)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 18,
    gap: 14,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
  },
  featureIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginTop: 2,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: '#F0FDF4',
    fontSize: 15,
    fontWeight: '700',
  },
  featureDesc: {
    color: '#BBF7D0',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  getStartedBtn: {
    backgroundColor: '#ECFDF5',
    height: 58,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#052e16',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    marginBottom: 16,
  },
  getStartedText: {
    color: '#065F46',
    fontSize: 17,
    fontWeight: '700',
  },
  signInBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  signInText: {
    color: '#D1FAE5',
    fontSize: 14,
    fontWeight: '500',
  },
  footerNote: {
    textAlign: 'center',
    marginTop: 12,
    color: 'rgba(220,252,231,0.82)',
    fontSize: 12,
    fontWeight: '500',
  },
});
