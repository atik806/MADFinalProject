import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/use-translation';
import { useColors } from '../../features/officials/shared/constants/theme';

type Step = 1 | 2 | 3;

export default function ResetPasswordScreen() {
  const colors = useColors();
  const { t, lang, toggleLang } = useTranslation();
  const [step, setStep] = useState<Step>(1);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (otpTimer > 0) {
      timerRef.current = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [otpTimer]);

  const isPhoneValid = (val: string) => /^01\d{9}$/.test(val);
  const isEmailValid = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSendOtp = async () => {
    setError('');
    if (!phone.trim()) {
      setError(t('enterPhoneForReset'));
      return;
    }
    if (!isPhoneValid(phone) && !isEmailValid(phone)) {
      setError(t('invalidCredentials'));
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setOtpTimer(30);
    setStep(2);
  };

  const handleVerifyOtp = () => {
    setError('');
    if (!otp.trim() || otp.length < 4) {
      setError(t('enterOtp'));
      return;
    }
    setStep(3);
  };

  const handleResendOtp = async () => {
    setOtp('');
    setError('');
    setOtpTimer(30);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
  };

  const handleResetPassword = () => {
    setError('');
    if (!newPwd.trim() || newPwd.length < 6) {
      setError(t('passwordMinLength'));
      return;
    }
    if (newPwd !== confirmPwd) {
      setError('Passwords do not match');
      return;
    }
    Alert.alert('Success', t('passwordResetSuccess'), [
      { text: t('ok'), onPress: () => router.push('/view/login') },
    ]);
  };

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
            <Text style={styles.subtitle}>{t('resetPasswordTitle')}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.dashboard.cardBg }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.cardTitle, { color: colors.dashboard.textPrimary }]}>{t('resetPasswordTitle')}</Text>

              <View style={styles.stepperRow}>
                {([1, 2, 3] as const).map((s) => {
                  const isDone = s < step;
                  const isCurrent = s === step;
                  const label = s === 1 ? t('phoneStep') : s === 2 ? t('otpStep') : t('passwordStep');
                  return (
                    <View key={s} style={styles.stepItem}>
                      <View
                        style={[
                          styles.stepCircle,
                          { backgroundColor: colors.dashboard.border },
                          isDone && { backgroundColor: colors.dashboard.greenUp },
                          isCurrent && { backgroundColor: colors.deepGreen },
                        ]}
                      >
                        {isDone ? (
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        ) : (
                          <Text
                            style={[
                              styles.stepNum,
                              { color: colors.dashboard.textSecondary },
                              isCurrent && { color: '#fff' },
                            ]}
                          >
                            {s}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.stepLabel,
                          { color: colors.dashboard.textSecondary },
                          isCurrent && { color: colors.deepGreen, fontWeight: '700' },
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {step === 1 && (
                <View style={styles.stepContent}>
                  <Text style={[styles.instruction, { color: colors.dashboard.textSecondary }]}>{t('enterPhoneForReset')}</Text>

                  <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('phoneLabel')}</Text>
                  <View style={styles.inputGroup}>
                    <Ionicons
                      name="phone-portrait-outline"
                      size={18}
                      color={colors.dashboard.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary, backgroundColor: colors.dashboard.bg }]}
                      placeholder={t('phonePlaceholder')}
                      placeholderTextColor={colors.dashboard.textSecondary}
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={(v) => { setPhone(v); setError(''); }}
                    />
                  </View>

                  {error ? <Text style={[styles.errorText, { color: colors.dashboard.redDown }]}>{error}</Text> : null}

                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.deepGreen }]}
                    onPress={handleSendOtp}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.primaryBtnText}>{t('sendOtp')}</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {step === 2 && (
                <View style={styles.stepContent}>
                  <Text style={[styles.instruction, { color: colors.dashboard.textSecondary }]}>
                    {t('otpSent')} {phone || '013XXXXXXXX'}
                  </Text>

                  <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('enterOtp')}</Text>
                  <View style={styles.inputGroup}>
                    <Ionicons
                      name="key-outline"
                      size={18}
                      color={colors.dashboard.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary, backgroundColor: colors.dashboard.bg }]}
                      placeholder={t('otpPlaceholder')}
                      placeholderTextColor={colors.dashboard.textSecondary}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otp}
                      onChangeText={(v) => { setOtp(v); setError(''); }}
                    />
                  </View>

                  {error ? <Text style={[styles.errorText, { color: colors.dashboard.redDown }]}>{error}</Text> : null}

                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.deepGreen }]}
                    onPress={handleVerifyOtp}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryBtnText}>{t('verifyOtp')}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={handleResendOtp}
                    disabled={otpTimer > 0 || loading}
                    activeOpacity={0.7}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.deepGreen} size="small" />
                    ) : (
                      <Text style={[styles.resendText, { color: colors.deepGreen }]}>
                        {otpTimer > 0 ? `${t('resendOtp')} (${otpTimer}s)` : t('resendOtp')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {step === 3 && (
                <View style={styles.stepContent}>
                  <Text style={[styles.instruction, { color: colors.dashboard.textSecondary }]}>{t('enterPhoneForReset')}</Text>

                  <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('newPassword')}</Text>
                  <View style={styles.inputGroup}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={colors.dashboard.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.inputPassword, { borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary, backgroundColor: colors.dashboard.bg }]}
                      placeholder={t('passwordPlaceholder')}
                      placeholderTextColor={colors.dashboard.textSecondary}
                      secureTextEntry={!showNewPwd}
                      value={newPwd}
                      onChangeText={(v) => { setNewPwd(v); setError(''); }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPwd((p) => !p)}
                      style={styles.eyeButton}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={showNewPwd ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.dashboard.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('confirmPassword')}</Text>
                  <View style={styles.inputGroup}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={colors.dashboard.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.inputPassword, { borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary, backgroundColor: colors.dashboard.bg }]}
                      placeholder={t('passwordPlaceholder')}
                      placeholderTextColor={colors.dashboard.textSecondary}
                      secureTextEntry={!showConfirmPwd}
                      value={confirmPwd}
                      onChangeText={(v) => { setConfirmPwd(v); setError(''); }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPwd((p) => !p)}
                      style={styles.eyeButton}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={showConfirmPwd ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.dashboard.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>

                  {error ? <Text style={[styles.errorText, { color: colors.dashboard.redDown }]}>{error}</Text> : null}

                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.deepGreen }]}
                    onPress={handleResetPassword}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryBtnText}>{t('resetPasswordBtn')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={styles.backLink}
                onPress={() => router.push('/view/login')}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={16} color={colors.deepGreen} style={styles.backIcon} />
                <Text style={[styles.backLinkText, { color: colors.deepGreen }]}>{t('backToLogin')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
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
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitle: {
    color: '#fff',
    marginTop: 4,
    fontSize: 14,
    opacity: 0.9,
  },
  card: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    marginTop: 20,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    gap: 0,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
    marginRight: 24,
  },
  stepContent: {
    gap: 4,
  },
  instruction: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  inputGroup: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
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
  eyeButton: {
    position: 'absolute',
    right: 14,
    zIndex: 1,
    padding: 4,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 24,
    gap: 6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  backLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 10,
  },
  backIcon: {
    marginRight: 6,
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
});
