import React, { useState } from 'react';
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
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/use-translation';

type Step = 1 | 2 | 3;
const BRAND_GREEN = '#006847';

export default function ResetPasswordScreen() {
  const { t, lang, toggleLang } = useTranslation();
  const [step] = useState<Step>(1);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

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
            <Text style={styles.subtitle}>{t('resetPasswordTitle')}</Text>
          </View>

          <View style={styles.card}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.cardTitle}>{t('resetPasswordTitle')}</Text>

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
                          isDone && styles.stepCircleDone,
                          isCurrent && styles.stepCircleCurrent,
                        ]}
                      >
                        {isDone ? (
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        ) : (
                          <Text
                            style={[
                              styles.stepNum,
                              isCurrent && styles.stepNumCurrent,
                            ]}
                          >
                            {s}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.stepLabel,
                          isCurrent && styles.stepLabelCurrent,
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
                  <Text style={styles.instruction}>{t('enterPhoneForReset')}</Text>

                  <Text style={styles.label}>{t('phoneLabel')}</Text>
                  <View style={styles.inputGroup}>
                    <Ionicons
                      name="phone-portrait-outline"
                      size={18}
                      color="#9CA3AF"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input]}
                      placeholder={t('phonePlaceholder')}
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                    />
                  </View>

                  <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.8}>
                    <Text style={styles.primaryBtnText}>{t('sendOtp')}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}

              {step === 2 && (
                <View style={styles.stepContent}>
                  <Text style={styles.instruction}>
                    {t('otpSent')} {phone || '013XXXXXXXX'}
                  </Text>

                  <Text style={styles.label}>{t('enterOtp')}</Text>
                  <View style={styles.inputGroup}>
                    <Ionicons
                      name="key-outline"
                      size={18}
                      color="#9CA3AF"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input]}
                      placeholder={t('otpPlaceholder')}
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otp}
                      onChangeText={setOtp}
                    />
                  </View>

                  <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.8}>
                    <Text style={styles.primaryBtnText}>{t('verifyOtp')}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.resendBtn} activeOpacity={0.7}>
                    <Text style={styles.resendText}>{t('resendOtp')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {step === 3 && (
                <View style={styles.stepContent}>
                  <Text style={styles.instruction}>{t('enterPhoneForReset')}</Text>

                  <Text style={styles.label}>{t('newPassword')}</Text>
                  <View style={styles.inputGroup}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color="#9CA3AF"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.inputPassword]}
                      placeholder={t('passwordPlaceholder')}
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showNewPwd}
                      value={newPwd}
                      onChangeText={setNewPwd}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPwd((p) => !p)}
                      style={styles.eyeButton}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={showNewPwd ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>{t('confirmPassword')}</Text>
                  <View style={styles.inputGroup}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color="#9CA3AF"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.inputPassword]}
                      placeholder={t('passwordPlaceholder')}
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showConfirmPwd}
                      value={confirmPwd}
                      onChangeText={setConfirmPwd}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPwd((p) => !p)}
                      style={styles.eyeButton}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={showConfirmPwd ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.8}>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryBtnText}>{t('resetPasswordBtn')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Link href="/view/login" asChild>
                <TouchableOpacity style={styles.backLink} activeOpacity={0.7}>
                  <Ionicons name="arrow-back" size={16} color={BRAND_GREEN} style={styles.backIcon} />
                  <Text style={styles.backLinkText}>{t('backToLogin')}</Text>
                </TouchableOpacity>
              </Link>
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
    backgroundColor: BRAND_GREEN,
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
    backgroundColor: 'rgba(255,255,255,0.15)',
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
    backgroundColor: 'rgba(255,255,255,0.15)',
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
    backgroundColor: '#fff',
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
    color: '#1F2937',
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
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleDone: {
    backgroundColor: '#16A34A',
  },
  stepCircleCurrent: {
    backgroundColor: BRAND_GREEN,
  },
  stepNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  stepNumCurrent: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    marginLeft: 6,
    marginRight: 24,
  },
  stepLabelCurrent: {
    color: BRAND_GREEN,
    fontWeight: '700',
  },
  stepContent: {
    gap: 4,
  },
  instruction: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
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
  eyeButton: {
    position: 'absolute',
    right: 14,
    zIndex: 1,
    padding: 4,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: BRAND_GREEN,
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
    color: BRAND_GREEN,
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
    color: BRAND_GREEN,
    fontSize: 14,
    fontWeight: '500',
  },
});
