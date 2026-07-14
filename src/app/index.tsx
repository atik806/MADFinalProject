import { Text, View, StyleSheet, SafeAreaView, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/use-translation';

export default function LandingPage() {
  const { t, lang, toggleLang } = useTranslation();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.langRow}>
        <View />
        <TouchableOpacity onPress={toggleLang} hitSlop={8} style={styles.langBtn}>
          <Text style={styles.langText}>{lang === 'en' ? 'বাং' : 'EN'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
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
            <Text style={styles.featureIcon}>📊</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{t('creditProfile')}</Text>
              <Text style={styles.featureDesc}>{t('creditProfileDesc')}</Text>
            </View>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>🌾</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{t('agriSupport')}</Text>
              <Text style={styles.featureDesc}>{t('agriSupportDesc')}</Text>
            </View>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>🔒</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{t('secureTransparent')}</Text>
              <Text style={styles.featureDesc}>{t('secureTransparentDesc')}</Text>
            </View>
          </View>
        </View>

        <Pressable style={styles.getStartedBtn} onPress={() => router.push('/view/login')}>
          <Text style={styles.getStartedText}>{t('getStarted')}</Text>
        </Pressable>

        <Pressable style={styles.signInBtn} onPress={() => router.push('/view/login')}>
          <Text style={styles.signInText}>{t('alreadyRegistered')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#006847',
  },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  langBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoBox: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
    marginTop: 12,
  },
  tagline: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    opacity: 0.9,
  },
  description: {
    color: '#cfe8dd',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  features: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
    gap: 20,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  featureDesc: {
    color: '#cfe8dd',
    fontSize: 13,
    marginTop: 2,
  },
  getStartedBtn: {
    backgroundColor: '#fff',
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    marginBottom: 16,
  },
  getStartedText: {
    color: '#006847',
    fontSize: 18,
    fontWeight: '700',
  },
  signInBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  signInText: {
    color: '#cfe8dd',
    fontSize: 14,
  },
});
