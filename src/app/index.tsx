import { Text, View, StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { Link } from 'expo-router';

export default function LandingPage() {

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <View style={styles.logoBox}>
            <Text style={styles.logo}>🌿</Text>
          </View>
          <Text style={styles.title}>SOFOL</Text>
          <Text style={styles.tagline}>Farmer Credit Profile Platform</Text>
          <Text style={styles.description}>
            Empowering Bangladeshi farmers with access to credit, financial profiles, and agricultural
            growth opportunities.
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>📊</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Credit Profile</Text>
              <Text style={styles.featureDesc}>Build and track your digital credit history</Text>
            </View>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>🌾</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Agricultural Support</Text>
              <Text style={styles.featureDesc}>Get tailored financial products for farming</Text>
            </View>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>🔒</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Secure & Transparent</Text>
              <Text style={styles.featureDesc}>Your data is safe with end-to-end encryption</Text>
            </View>
          </View>
        </View>

        <Link href="/view/login" asChild>
          <Pressable style={styles.getStartedBtn}>
            <Text style={styles.getStartedText}>শুরু করুন / Get Started</Text>
          </Pressable>
        </Link>

        <Link href="/view/login" asChild>
          <Pressable style={styles.signInBtn}>
            <Text style={styles.signInText}>ইতিমধ্যে নিবন্ধিত? সাইন ইন / Already registered? Sign In</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#006847',
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
  logo: {
    fontSize: 48,
  },
  title: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
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
