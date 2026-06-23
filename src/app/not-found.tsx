import { Text, View, StyleSheet, SafeAreaView, Pressable, Dimensions } from 'react-native';
import { Link } from 'expo-router';

const { width } = Dimensions.get('window');

export default function NotFoundScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.errorCircle}>
          <Text style={styles.errorIcon}>🌿</Text>
        </View>

        <View style={styles.codeBox}>
          {[4, 0, 4].map((digit, i) => (
            <Text key={i} style={[styles.code, i === 1 && styles.codeCenter]}>
              {digit}
            </Text>
          ))}
        </View>

        <Text style={styles.title}>পাতা পাওয়া যায়নি</Text>
        <Text style={styles.subtitle}>Page Not Found</Text>

        <View style={styles.divider} />

        <Text style={styles.description}>
          আপনি যে পৃষ্ঠাটি খুঁজছেন তা বিদ্যমান নেই বা সরানো হয়েছে।
        </Text>
        <Text style={styles.descriptionSub}>
          The page you are looking for does not exist or has been moved.
        </Text>

        <Link href="/" asChild>
          <Pressable style={({ pressed }) => [
            styles.homeBtn,
            pressed && styles.homeBtnPressed,
          ]}>
            <Text style={styles.homeBtnText}>মূল পাতায় ফিরে যান</Text>
            <Text style={styles.homeBtnSub}>Back to Home</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#006847',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorIcon: {
    fontSize: 40,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  code: {
    fontSize: width * 0.18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 4,
  },
  codeCenter: {
    opacity: 0.35,
    fontSize: width * 0.22,
    marginHorizontal: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 15,
    color: '#cfe8dd',
    fontWeight: '600',
    marginBottom: 24,
  },
  divider: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 24,
  },
  description: {
    fontSize: 14,
    color: '#cfe8dd',
    textAlign: 'center',
    lineHeight: 22,
  },
  descriptionSub: {
    fontSize: 13,
    color: 'rgba(207,232,221,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 40,
    marginTop: 4,
  },
  homeBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 6,
    width: width * 0.75,
    maxWidth: 320,
  },
  homeBtnPressed: {
    opacity: 0.85,
  },
  homeBtnText: {
    color: '#006847',
    fontSize: 16,
    fontWeight: '700',
  },
  homeBtnSub: {
    color: '#006847',
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
});
