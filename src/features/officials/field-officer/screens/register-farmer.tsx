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

const registrationSchema = z.object({
  nameEn: z.string().trim().min(1, 'Enter the farmer name').max(120, 'Name is too long'),
  nameBn: z.string().trim().max(120, 'Name is too long'),
  nid: z.string().trim().min(1, 'Enter the NID').regex(/^[0-9A-Za-z-]+$/, 'Enter a valid NID'),
  phone: z.string().trim().min(7, 'Enter a valid phone number').max(32, 'Phone number is too long'),
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
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { nameEn: '', nameBn: '', nid: '', phone: '', password: '' },
  });

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
    options?: { secureTextEntry?: boolean; keyboardType?: 'default' | 'phone-pad' },
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{label}</Text>
          <TextInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            placeholderTextColor={colors.dashboard.textSecondary}
            secureTextEntry={options?.secureTextEntry}
            keyboardType={options?.keyboardType ?? 'default'}
            autoCapitalize={name === 'nid' || name === 'phone' ? 'none' : 'words'}
            style={[
              styles.input,
              {
                backgroundColor: colors.dashboard.cardBg,
                borderColor: errors[name] ? colors.dashboard.redDown : colors.dashboard.border,
                color: colors.dashboard.textPrimary,
              },
            ]}
          />
          {errors[name]?.message ? <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors[name]?.message}</Text> : null}
        </View>
      )}
    />
  );

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
        {renderField('nid', 'NID', 'Enter NID')}
        {renderField('phone', 'Phone number', '01XXXXXXXXX', { keyboardType: 'phone-pad' })}
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
  input: { height: 52, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, fontSize: 15, marginBottom: 6 },
  error: { fontSize: 12, marginBottom: 8 },
  requestError: { fontSize: 13, marginBottom: 12 },
  submit: { minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.7 },
});
