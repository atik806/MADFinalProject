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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, getRouteForRole } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/use-translation';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColors } from '../../features/officials/shared/constants/theme';

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

export default function LoginScreen() {
  const colors = useColors();
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.deepGreen }]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.root}>
          <View style={styles.langRow}>
            <View />
            <TouchableOpacity onPress={toggleLang} hitSlop={8} style={[styles.langBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={styles.langText}>{lang === 'en' ? 'বাং' : 'EN'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.header}>
            <View style={[styles.logoBox, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Ionicons name="leaf" size={40} color="#fff" />
            </View>
            <Text style={styles.title}>SOFOL</Text>
            <Text style={styles.subtitle}>{t('tagline')}</Text>
          </View>

          <Animated.View
            entering={FadeInDown.duration(400).springify()}
            style={[styles.card, { backgroundColor: colors.dashboard.cardBg }]}
          >
            <Text style={[styles.loginTitle, { color: colors.dashboard.textPrimary }]}>{t('loginTitle')}</Text>

            <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('identifierLabel')}</Text>
            <View style={styles.inputGroup}>
              <Ionicons
                name={identifierIcon}
                size={18}
                color={focusedField === 'identifier' ? colors.deepGreen : colors.dashboard.textSecondary}
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
                      { borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary, backgroundColor: colors.dashboard.bg },
                      focusedField === 'identifier' && { borderColor: colors.deepGreen, backgroundColor: colors.dashboard.cardBg },
                      errors.identifier && { borderColor: colors.dashboard.redDown, backgroundColor: colors.userRejected },
                    ]}
                    placeholder={t('identifierPlaceholder')}
                    placeholderTextColor={colors.dashboard.textSecondary}
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
              <Text style={[styles.errorText, { color: colors.dashboard.redDown }]}>{errors.identifier.message}</Text>
            ) : null}

            <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('passwordLabel')}</Text>
            <View style={styles.inputGroup}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={focusedField === 'password' ? colors.deepGreen : colors.dashboard.textSecondary}
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
                      { borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary, backgroundColor: colors.dashboard.bg },
                      focusedField === 'password' && { borderColor: colors.deepGreen, backgroundColor: colors.dashboard.cardBg },
                      errors.password && { borderColor: colors.dashboard.redDown, backgroundColor: colors.userRejected },
                    ]}
                    placeholder={t('passwordPlaceholder')}
                    placeholderTextColor={colors.dashboard.textSecondary}
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
                  color={colors.dashboard.textSecondary}
                />
              </Pressable>
            </View>
            {errors.password && errors.password.message ? (
              <Text style={[styles.errorText, { color: colors.dashboard.redDown }]}>{errors.password.message}</Text>
            ) : null}

            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotButton}>
              <Text style={[styles.forgotText, { color: colors.deepGreen }]}>{t('forgotPassword')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: colors.deepGreen }, isSubmitting && { opacity: 0.7 }]}
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

            <Pressable
              style={StyleSheet.flatten([styles.signupButton, { borderColor: colors.deepGreen }])}
              onPress={() => router.push('/view/FarmerRegistration/farmer-registration')}
            >
              <Text style={StyleSheet.flatten([styles.signupText, { color: colors.deepGreen }])}>{t('signUp')}</Text>
            </Pressable>

            <Pressable style={styles.backButton} onPress={() => router.push('/')}>
              <Ionicons
                name="arrow-back"
                size={16}
                color={colors.deepGreen}
                style={styles.backIcon}
              />
              <Text style={StyleSheet.flatten([styles.backText, { color: colors.deepGreen }])}>{t('backToHome')}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
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
    borderRadius: 14,
    paddingLeft: 44,
    paddingRight: 14,
    fontSize: 15,
  },
  inputPassword: {
    paddingRight: 44,
  },
  errorText: {
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
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
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
    marginTop: 14,
  },
  signupText: {
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
    fontSize: 14,
    fontWeight: '500',
  },
});
