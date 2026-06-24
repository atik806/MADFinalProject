import React, { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import Animated, { FadeInDown } from 'react-native-reanimated';

const loginSchema = z.object({
  phone: z
    .string()
    .min(1, "মোবাইল নম্বর দিন / Enter phone number")
    .regex(/^01\d{9}$/, "বৈধ মোবাইল নম্বর দিন / Enter a valid 11-digit phone number"),
  password: z
    .string()
    .min(1, "পাসওয়ার্ড দিন / Enter password")
    .min(6, "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর / Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const BRAND_GREEN = '#006847';

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const { login, isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (shouldRedirect && isLoggedIn) {
      const timer = setTimeout(() => {
        router.replace('/view/FarmerDashboard/farmer-dashboard');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldRedirect, isLoggedIn, router]);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '01302228993', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    if (data.phone !== '01302228993' || data.password !== '123456') {
      if (data.phone !== '01302228993') {
        setError('phone', { message: 'ভুল মোবাইল নম্বর / Invalid phone number' });
      }
      if (data.password !== '123456') {
        setError('password', { message: 'ভুল পাসওয়ার্ড / Invalid password' });
      }
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
    login(data.phone);
    setShouldRedirect(true);
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'পাসওয়ার্ড রিসেট / Reset Password',
      'এই ফিচার শীঘ্রই আসছে।\n\nThis feature is coming soon.',
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.root}>
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Ionicons name="leaf" size={40} color="#fff" />
            </View>
            <Text style={styles.title}>SOFOL</Text>
            <Text style={styles.subtitle}>কৃষক ক্রেডিট প্রোফাইল প্ল্যাটফর্ম</Text>
            <Text style={styles.subText}>Farmer Credit Profile Platform - Bangladesh</Text>
          </View>

          <Animated.View
            entering={FadeInDown.duration(400).springify()}
            style={styles.card}
          >
            <Text style={styles.loginTitle}>লগইন / Sign In</Text>

            <Text style={styles.label}>মোবাইল নম্বর / Phone Number</Text>
            <View style={styles.inputGroup}>
              <Ionicons
                name="phone-portrait-outline"
                size={18}
                color={focusedField === 'phone' ? BRAND_GREEN : '#9CA3AF'}
                style={styles.inputIcon}
              />
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    ref={phoneRef}
                    style={[
                      styles.input,
                      focusedField === 'phone' && styles.inputFocused,
                      errors.phone && styles.inputError,
                    ]}
                    placeholder="01711-234567"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    value={value}
                    onChangeText={onChange}
                    onBlur={() => {
                      onBlur();
                      setFocusedField(null);
                    }}
                    onFocus={() => setFocusedField('phone')}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                )}
              />
            </View>
            {errors.phone && (
              <Text style={styles.errorText}>{errors.phone.message}</Text>
            )}

            <Text style={styles.label}>পাসওয়ার্ড / Password</Text>
            <View style={styles.inputGroup}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={focusedField === 'password' ? BRAND_GREEN : '#9CA3AF'}
                style={styles.inputIcon}
              />
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    ref={passwordRef}
                    style={[
                      styles.input,
                      styles.inputPassword,
                      focusedField === 'password' && styles.inputFocused,
                      errors.password && styles.inputError,
                    ]}
                    placeholder="********"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    value={value}
                    onChangeText={onChange}
                    onBlur={() => {
                      onBlur();
                      setFocusedField(null);
                    }}
                    onFocus={() => setFocusedField('password')}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                  />
                )}
              />
              <Pressable
                onPress={() => setShowPassword((p) => !p)}
                style={styles.eyeButton}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#9CA3AF"
                />
              </Pressable>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password.message}</Text>
            )}

            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotButton}>
              <Text style={styles.forgotText}>
                পাসওয়ার্ড ভুলে গেছেন? / Forgot Password?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>লগইন / Login</Text>
              )}
            </TouchableOpacity>

            <Link href="/view/FarmerRegistration/farmer-registration" asChild>
              <Pressable style={styles.signupButton}>
                <Text style={styles.signupText}>নিবন্ধন করুন / Sign Up</Text>
              </Pressable>
            </Link>

            <Link href="/" asChild>
              <Pressable style={styles.backButton}>
                <Ionicons
                  name="arrow-back"
                  size={16}
                  color={BRAND_GREEN}
                  style={styles.backIcon}
                />
                <Text style={styles.backText}>Back to home</Text>
              </Pressable>
            </Link>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_GREEN,
  },
  root: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#fff',
    marginTop: 6,
    fontSize: 14,
    opacity: 0.9,
  },
  subText: {
    color: '#cfe8dd',
    marginTop: 2,
    fontSize: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  inputGroup: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingLeft: 44,
    paddingRight: 14,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  inputPassword: {
    paddingRight: 44,
  },
  inputFocused: {
    borderColor: BRAND_GREEN,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 14,
    marginLeft: 4,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    zIndex: 1,
    padding: 4,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: 4,
  },
  forgotText: {
    color: BRAND_GREEN,
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: BRAND_GREEN,
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 8px rgba(0,104,71,0.2)',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  signupButton: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BRAND_GREEN,
    marginTop: 14,
  },
  signupText: {
    color: BRAND_GREEN,
    fontSize: 15,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
    marginBottom: 24,
  },
  backIcon: {
    marginRight: 6,
  },
  backText: {
    color: BRAND_GREEN,
    fontSize: 14,
    fontWeight: '500',
  },
});
