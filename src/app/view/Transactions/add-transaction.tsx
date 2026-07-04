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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTransactions } from '../../../contexts/TransactionContext';
import { useTranslation } from '../../../hooks/use-translation';
import { useColors } from '../../../features/officials/shared/constants/theme';

const categories = ['Income', 'Expense'] as const;

export default function AddTransactionScreen() {
  const colors = useColors();
  const { addTransaction } = useTransactions();
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<'Income' | 'Expense'>('Expense');

  const handleSave = () => {
    if (!title.trim() || !amount.trim()) return;
    const numericAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).replace(/ /g, ' ');

    addTransaction({
      title: title.trim(),
      description: description.trim(),
      date: dateStr,
      amount: category === 'Expense' ? -numericAmount : numericAmount,
      category,
    });
    router.back();
  };

  const canSave = title.trim().length > 0 && amount.trim().length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.dashboard.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { backgroundColor: colors.dashboard.cardBg, borderBottomColor: colors.dashboard.border }]}>
          <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.dashboard.textPrimary} />
          </TouchableOpacity>
          <View style={[styles.headerLogo, { backgroundColor: colors.deepGreen }]}>
            <Ionicons name="leaf" size={18} color="#fff" />
          </View>
        </View>
        <Text style={[styles.headerTitle, { color: colors.dashboard.textPrimary }]}>{t('addTransactionTitle')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('type')}</Text>
          <View style={styles.toggleRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.toggleBtn, { borderColor: colors.dashboard.border, backgroundColor: colors.dashboard.cardBg }, category === cat && { borderColor: colors.deepGreen, backgroundColor: colors.userVerified }]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.toggleText, { color: colors.dashboard.textSecondary }, category === cat && { color: colors.deepGreen }]}>
                  {cat === 'Income' ? '💰 ' : '💸 '}{cat === 'Income' ? t('incomeType') : t('expenseType')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('titleLabel')}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary, backgroundColor: colors.dashboard.cardBg }]}
            placeholder={t('titlePlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('descOptional')}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary, backgroundColor: colors.dashboard.cardBg }]}
            placeholder={t('descPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
            value={description}
            onChangeText={setDescription}
          />

          <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('amountLabel')}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary, backgroundColor: colors.dashboard.cardBg }]}
            placeholder={t('amountPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.dashboard.cardBg, borderTopColor: colors.dashboard.border }]}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.deepGreen }, !canSave && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.saveBtnText}>{t('saveTransaction')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  form: {
    padding: 18,
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  saveBtn: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
