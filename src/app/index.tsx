import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { getRouteForRole, useAuth } from '../contexts/AuthContext';
import { useColors } from '../features/officials/shared/constants/theme';
import { useTranslation } from '../hooks/use-translation';

const heroImage = require('../../assets/images/landing-hero.jpg');

export default function LandingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const colors = useColors();
  const { height: screenHeight } = useWindowDimensions();

  // A restored session skips the landing page and goes straight to the
  // role-appropriate dashboard.
  if (isLoggedIn && user) {
    return <Redirect href={getRouteForRole(user.role)} />;
  }

  // The whole page must fit one screen with no scrolling, so the hero photo's
  // height scales with the device instead of being a fixed pixel value.
  const heroHeight = Math.max(160, Math.min(screenHeight * 0.3, 260));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.deepGreen }]}>
      <View style={styles.bgGlowBottom} pointerEvents="none" />

      <View style={styles.page}>
        <View style={[styles.heroImageWrap, { height: heroHeight }]}>
          <Image
            source={heroImage}
            style={styles.heroImage}
            contentFit="cover"
            transition={200}
            accessibilityLabel="Farmers harvesting rice in a Bangladeshi paddy field"
          />
          <LinearGradient
            colors={['rgba(4,30,20,0.55)', 'rgba(4,90,63,0.25)', colors.deepGreen]}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="sparkles-outline" size={13} color="#D1FAE5" />
              <Text style={styles.badgeText}>Digital Agriculture Finance</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.hero}>
            <View style={[styles.logoBox, { borderColor: colors.deepGreen }]}>
              <Ionicons name="leaf" size={28} color="#fff" />
            </View>

            <Text style={styles.title}>SOFOL</Text>
            <Text style={styles.tagline}>{t('tagline')}</Text>

            <Text style={styles.description} numberOfLines={2}>
              {t('landingDesc')}
            </Text>
          </View>

          <View style={styles.features}>
            <View style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Ionicons name="analytics-outline" size={15} color="#ECFDF5" />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{t('creditProfile')}</Text>
                <Text style={styles.featureDesc} numberOfLines={1}>{t('creditProfileDesc')}</Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Ionicons name="leaf-outline" size={15} color="#ECFDF5" />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{t('agriSupport')}</Text>
                <Text style={styles.featureDesc} numberOfLines={1}>{t('agriSupportDesc')}</Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Ionicons name="shield-checkmark-outline" size={15} color="#ECFDF5" />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{t('secureTransparent')}</Text>
                <Text style={styles.featureDesc} numberOfLines={1}>{t('secureTransparentDesc')}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.getStartedBtn} onPress={() => router.push('/view/login')} accessibilityRole="button" accessibilityLabel={t('getStarted')}>
              <Text style={styles.getStartedText}>{t('getStarted')}</Text>
              <Ionicons name="arrow-forward" size={17} color="#065F46" />
            </Pressable>

            <Pressable style={styles.signInBtn} onPress={() => router.push('/view/login')} accessibilityRole="button" accessibilityLabel={t('alreadyRegistered')}>
              <Text style={styles.signInText}>{t('alreadyRegistered')}</Text>
              <Ionicons name="log-in-outline" size={15} color="#D1FAE5" />
            </Pressable>

            <Text style={styles.footerNote} numberOfLines={1}>Built for farmers, field officers, and lending partners.</Text>
            <Text style={styles.photoCredit} numberOfLines={1}>Photo: A S M Jobaer / Wikimedia Commons (CC BY-SA 4.0)</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#047857',
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
  page: {
    flex: 1,
  },
  heroImageWrap: {
    width: '100%',
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: '#03462f',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  badgeRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 14,
    alignItems: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    paddingTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  badgeText: {
    color: '#DCFCE7',
    fontSize: 11,
    fontWeight: '600',
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -36,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: 'rgba(4,120,87,1)',
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1.2,
  },
  tagline: {
    color: '#ECFDF5',
    fontSize: 13.5,
    fontWeight: '600',
    marginTop: 4,
  },
  description: {
    color: '#D1FAE5',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16.5,
    paddingHorizontal: 4,
  },
  features: {
    backgroundColor: 'rgba(3,84,62,0.55)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: '#F0FDF4',
    fontSize: 12.5,
    fontWeight: '700',
  },
  featureDesc: {
    color: '#BBF7D0',
    fontSize: 10.5,
    marginTop: 1,
  },
  actions: {
    paddingBottom: 4,
  },
  getStartedBtn: {
    backgroundColor: '#ECFDF5',
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#052e16',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    marginBottom: 6,
  },
  getStartedText: {
    color: '#065F46',
    fontSize: 15,
    fontWeight: '700',
  },
  signInBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  signInText: {
    color: '#D1FAE5',
    fontSize: 12.5,
    fontWeight: '500',
  },
  footerNote: {
    textAlign: 'center',
    marginTop: 8,
    color: 'rgba(220,252,231,0.82)',
    fontSize: 10.5,
    fontWeight: '500',
  },
  photoCredit: {
    textAlign: 'center',
    marginTop: 3,
    color: 'rgba(220,252,231,0.45)',
    fontSize: 8.5,
  },
});
