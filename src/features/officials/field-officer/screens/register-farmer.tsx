import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';

import { useAuth } from '@/contexts/AuthContext';
import { ScreenHeader } from '@/features/officials/shared/components/screen-header';
import { useColors } from '@/features/officials/shared/constants/theme';
import { api } from '@/lib/api';
import { bdPhoneFieldStatus, isBdPhone, isFarmerNid, nidFieldStatus, type FieldStatus } from '@/lib/validation';

const registrationSchema = z.object({
  nameEn: z.string().trim().min(1, 'Enter the farmer name').max(120, 'Name is too long'),
  nameBn: z.string().trim().max(120, 'Name is too long'),
  nid: z
    .string()
    .trim()
    .min(1, 'Enter the NID')
    .refine(isFarmerNid, 'Enter a 10 or 17 digit NID number'),
  phone: z
    .string()
    .trim()
    .min(1, 'Enter a valid phone number')
    .refine(isBdPhone, 'Enter a valid phone number (1XXXXXXXXX)'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

export default function RegisterFarmerScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const [requestError, setRequestError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { nameEn: '', nameBn: '', nid: '', phone: '', password: '' },
  });

  const nidStatus = nidFieldStatus(watch('nid'));
  const phoneStatus = bdPhoneFieldStatus(watch('phone'));

  if (!isLoggedIn || user?.role !== 'field-officer') {
    return <Redirect href={'/officials/login' as any} />;
  }

  const onSubmit = async (values: RegistrationForm) => {
    setRequestError(null);
    try {
      await api.post('/api/field-officer/farmers', values);
      Alert.alert('Farmer registered', 'The farmer was added to your assigned farmer list.', [
        { text: 'OK', onPress: () => router.replace('/officials/(field-officer)') },
      ]);
    } catch (error: any) {
      const message = error?.message ?? 'Could not register the farmer. Please try again.';
      setRequestError(message);
      if (error?.status === 400) {
        setError('nid', { message });
      }
    }
  };

  const renderField = (
    name: keyof RegistrationForm,
    label: string,
    placeholder: string,
    options?: { secureTextEntry?: boolean; keyboardType?: 'default' | 'phone-pad'; status?: FieldStatus },
  ) => {
    const status = options?.status;
    const borderColor = errors[name]
      ? colors.dashboard.redDown
      : status === 'invalid'
        ? colors.dashboard.redDown
        : status === 'valid'
          ? colors.deepGreen
          : colors.dashboard.border;
    return (
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{label}</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.dashboard.cardBg, borderColor }]}>
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={placeholder}
                placeholderTextColor={colors.dashboard.textSecondary}
                secureTextEntry={options?.secureTextEntry}
                keyboardType={options?.keyboardType ?? 'default'}
                autoCapitalize={name === 'nid' || name === 'phone' ? 'none' : 'words'}
                style={[styles.inputInner, { color: colors.dashboard.textPrimary }]}
              />
              {status ? (
                <View style={styles.fieldStatusIcon}>
                  {status === 'valid' && <Ionicons name="checkmark-circle" size={20} color={colors.deepGreen} />}
                  {status === 'invalid' && <Ionicons name="close-circle" size={20} color={colors.dashboard.redDown} />}
                </View>
              ) : null}
            </View>
            {errors[name]?.message ? <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors[name]?.message}</Text> : null}
          </View>
        )}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.dashboard.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Add Farmer" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.intro, { color: colors.dashboard.textSecondary }]}>
          Register a farmer and assign them to your Field Officer account.
        </Text>
        {renderField('nameEn', 'Farmer name', 'Enter full name')}
        {renderField('nameBn', 'Farmer name (Bangla)', 'Optional')}
        {renderField('nid', 'NID', 'Enter NID', { status: nidStatus })}
        {renderField('phone', 'Phone number', '01XXXXXXXXX', { keyboardType: 'phone-pad', status: phoneStatus })}
        {renderField('password', 'Temporary password', 'At least 6 characters', { secureTextEntry: true })}
        {requestError ? <Text style={[styles.requestError, { color: colors.dashboard.redDown }]}>{requestError}</Text> : null}
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Register farmer"
          style={[styles.submit, { backgroundColor: colors.deepGreen }, isSubmitting && styles.disabled]}>
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Register Farmer</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 18 },
  field: { marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  inputRow: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputInner: { flex: 1, fontSize: 15, paddingVertical: 12 },
  fieldStatusIcon: { width: 24, justifyContent: 'center', alignItems: 'center' },
  error: { fontSize: 12, marginBottom: 8 },
  requestError: { fontSize: 13, marginBottom: 12 },
  submit: { minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.7 },
});
