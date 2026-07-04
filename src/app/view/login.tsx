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
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, getRouteForRole } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/use-translation';
import Animated, { FadeInDown } from 'react-native-reanimated';

const isPhone = (value: string) => /^01\d{9}$/.test(value);
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Enter email or phone number')
    .refine((val) => isPhone(val) || isEmail(val), 'Enter a valid email or 11-digit phone number'),
  password: z
    .string()
    .min(1, 'Enter password')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const BRAND_GREEN = '#006847';

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const identifierRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const { login, isLoggedIn, user } = useAuth();
  const { t, lang, toggleLang } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (shouldRedirect && isLoggedIn && user) {
      const timer = setTimeout(() => {
        router.replace(getRouteForRole(user.role));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldRedirect, isLoggedIn, user, router]);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.identifier, data.password);
      setShouldRedirect(true);
    } catch {
      setError('identifier', { message: t('invalidCredentials') });
      setError('password', { message: '' });
    }
  };

  const handleForgotPassword = () => {
    router.push('/view/reset-password');
  };

  const identifierIcon = focusedField === 'identifier'
    ? 'mail-outline'
    : 'phone-portrait-outline';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.root}>
          <View style={styles.langRow}>
            <View />
            <TouchableOpacity onPress={toggleLang} hitSlop={8} style={styles.langBtn}>
              <Text style={styles.langText}>{lang === 'en' ? 'বাং' : 'EN'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Ionicons name="leaf" size={40} color="#fff" />
            </View>
            <Text style={styles.title}>SOFOL</Text>
            <Text style={styles.subtitle}>{t('tagline')}</Text>
          </View>

          <Animated.View
            entering={FadeInDown.duration(400).springify()}
            style={styles.card}
          >
            <Text style={styles.loginTitle}>{t('loginTitle')}</Text>

            <Text style={styles.label}>{t('identifierLabel')}</Text>
            <View style={styles.inputGroup}>
              <Ionicons
                name={identifierIcon}
                size={18}
                color={focusedField === 'identifier' ? BRAND_GREEN : '#9CA3AF'}
                style={styles.inputIcon}
              />
              <Controller
                control={control}
                name="identifier"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    ref={identifierRef}
                    style={[
                      styles.input,
                      focusedField === 'identifier' && styles.inputFocused,
                      errors.identifier && styles.inputError,
                    ]}
                    placeholder={t('identifierPlaceholder')}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={value}
                    onChangeText={onChange}
                    onBlur={() => {
                      onBlur();
                      setFocusedField(null);
                    }}
                    onFocus={() => setFocusedField('identifier')}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                )}
              />
            </View>
            {errors.identifier && errors.identifier.message ? (
              <Text style={styles.errorText}>{errors.identifier.message}</Text>
            ) : null}

            <Text style={styles.label}>{t('passwordLabel')}</Text>
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
                    placeholder={t('passwordPlaceholder')}
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
            {errors.password && errors.password.message ? (
              <Text style={styles.errorText}>{errors.password.message}</Text>
            ) : null}

            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotButton}>
              <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
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
                <Text style={styles.loginButtonText}>{t('loginButton')}</Text>
              )}
            </TouchableOpacity>

            <Link href="/view/FarmerRegistration/farmer-registration" asChild>
              <Pressable style={styles.signupButton}>
                <Text style={styles.signupText}>{t('signUp')}</Text>
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
                <Text style={styles.backText}>{t('backToHome')}</Text>
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
    marginBottom: 4,
  },
  subtitle: {
    color: '#fff',
    marginTop: 6,
    fontSize: 14,
    opacity: 0.9,
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
