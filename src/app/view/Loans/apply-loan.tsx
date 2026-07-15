import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useLoans } from '../../../contexts/LoanContext';
import { useTranslation } from '../../../hooks/use-translation';
import { useColors } from '../../../features/officials/shared/constants/theme';
import { amountPresets, purposes, durationPresets } from '@/data';

type Step = 1 | 2 | 3;
type InstallmentType = 'monthly' | 'seasonal';

function calculateEMI(principal: number, months: number, annualRate: number): number {
  if (months === 0) return 0;
  const r = annualRate / 12 / 100;
  const pow = Math.pow(1 + r, months);
  return Math.round(principal * r * pow / (pow - 1));
}

export default function ApplyLoanScreen() {
  const colors = useColors();
  const { addApplication } = useLoans();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(1);

  const [amount, setAmount] = useState(75000);
  const [customAmount, setCustomAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [durationMonths, setDurationMonths] = useState(6);
  const [installmentType, setInstallmentType] = useState<InstallmentType>('monthly');

  const [documents, setDocuments] = useState({
    nid: true,
    landDocument: false,
    farmPhotograph: true,
    previousLoanStatement: false,
  });

  const annualRate = 9;
  const emi = calculateEMI(amount, durationMonths, annualRate);
  const totalRepayment = emi * durationMonths;

  const toggleDoc = (key: keyof typeof documents) => {
    setDocuments((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const canGoNext = () => {
    if (step === 1) return purpose.length > 0 && amount > 0;
    if (step === 2) return documents.nid && documents.farmPhotograph;
    return true;
  };

  const canContinue = canGoNext();

  const handleNext = () => {
    if (!canContinue) return;
    if (step < 3) setStep((step + 1) as Step);
  };

  const handleBackStep = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    } else {
      router.back();
    }
  };

  const handleSubmit = () => {
    const monthsLabel = durationMonths === 1 ? '1 month' : `${durationMonths} months`;
    addApplication({
      title: purpose,
      amount,
      duration: monthsLabel,
      purpose,
      installmentType,
    });
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.dashboard.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.dashboard.cardBg, borderBottomColor: colors.dashboard.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleBackStep} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.dashboard.textPrimary} />
          </TouchableOpacity>
          <View style={[styles.headerLogo, { backgroundColor: colors.deepGreen }]}>
            <Ionicons name="leaf" size={18} color="#fff" />
          </View>
        </View>
        <Text style={[styles.headerTitle, { color: colors.dashboard.textPrimary }]}>{t('applyForLoan')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.stepper, { backgroundColor: colors.dashboard.cardBg }]}>
        {([1, 2, 3] as const).map((s) => {
          const isDone = s < step;
          const isCurrent = s === step;
          const label = s === 1 ? t('loanDetails') : s === 2 ? t('documents') : t('review');
          return (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepCircle, { backgroundColor: colors.dashboard.border }, isDone && { backgroundColor: colors.dashboard.greenUp }, isCurrent && { backgroundColor: colors.deepGreen }]}>
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text style={[styles.stepNum, { color: colors.dashboard.textSecondary }, isCurrent && { color: '#fff' }]}>{s}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, { color: colors.dashboard.textSecondary }, isCurrent && { color: colors.deepGreen, fontWeight: '700' }]}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <StepLoanDetails
            amount={amount}
            setAmount={setAmount}
            customAmount={customAmount}
            setCustomAmount={setCustomAmount}
            purpose={purpose}
            setPurpose={setPurpose}
            durationMonths={durationMonths}
            setDurationMonths={setDurationMonths}
            installmentType={installmentType}
            setInstallmentType={setInstallmentType}
            emi={emi}
            annualRate={annualRate}
            t={t}
            colors={colors}
          />
        )}
        {step === 2 && (
          <StepDocuments
            documents={documents}
            toggleDoc={toggleDoc}
            t={t}
            colors={colors}
          />
        )}
        {step === 3 && (
          <StepReview
            amount={amount}
            purpose={purpose}
            durationMonths={durationMonths}
            installmentType={installmentType}
            emi={emi}
            annualRate={annualRate}
            totalRepayment={totalRepayment}
            t={t}
            colors={colors}
          />
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.dashboard.cardBg, borderTopColor: colors.dashboard.border }]}>
        {step < 3 && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.deepGreen }, !canContinue && { opacity: 0.5 }]}
            onPress={handleNext}
            disabled={!canContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>
              {step === 2 ? t('nextReview') : t('nextUploadDocs')}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        )}
        {step === 3 && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.deepGreen }]}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>{t('submitApplication')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function StepLoanDetails({
  amount, setAmount, customAmount, setCustomAmount,
  purpose, setPurpose,
  durationMonths, setDurationMonths,
  installmentType, setInstallmentType,
  emi, annualRate, t, colors,
}: {
  amount: number;
  setAmount: (v: number) => void;
  customAmount: string;
  setCustomAmount: (v: string) => void;
  purpose: string;
  setPurpose: (v: string) => void;
  durationMonths: number;
  setDurationMonths: (v: number) => void;
  installmentType: InstallmentType;
  setInstallmentType: (v: InstallmentType) => void;
  emi: number;
  annualRate: number;
  t: (key: any) => string;
  colors: any;
}) {
  return (
    <View>
      <Text style={[styles.sectionLabel, { color: colors.dashboard.textPrimary }]}>{t('loanAmountLabel')}</Text>
      <View style={styles.chipRow}>
        {amountPresets.map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[styles.chip, { borderColor: colors.dashboard.border, backgroundColor: colors.dashboard.cardBg }, amount === preset && !customAmount && { borderColor: colors.deepGreen, backgroundColor: colors.userVerified }]}
            onPress={() => { setAmount(preset); setCustomAmount(''); }}
          >
            <Text style={[styles.chipText, { color: colors.dashboard.textSecondary }, amount === preset && !customAmount && { color: colors.deepGreen }]}>
              ৳{preset.toLocaleString('en-BD')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={[styles.input, { borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary, backgroundColor: colors.dashboard.cardBg }, customAmount.length > 0 && { borderColor: colors.deepGreen }]}
        placeholder={t('customAmount')}
        placeholderTextColor={colors.dashboard.textSecondary}
        keyboardType="decimal-pad"
        value={customAmount}
        onChangeText={(v) => { setCustomAmount(v); const n = parseInt(v.replace(/,/g, ''), 10); if (!isNaN(n)) setAmount(n); }}
      />

      <Text style={[styles.sectionLabel, { color: colors.dashboard.textPrimary }]}>{t('loanPurpose')}</Text>
      <View style={styles.purposeGrid}>
        {purposes.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.purposeBtn, { borderColor: colors.dashboard.border, backgroundColor: colors.dashboard.cardBg }, purpose === p && { borderColor: colors.deepGreen, backgroundColor: colors.userVerified }]}
            onPress={() => setPurpose(p)}
          >
            <Text style={[styles.purposeText, { color: colors.dashboard.textSecondary }, purpose === p && { color: colors.deepGreen }]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.dashboard.textPrimary }]}>{t('durationLabel')}</Text>
      <View style={styles.chipRow}>
        {durationPresets.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.chip, { borderColor: colors.dashboard.border, backgroundColor: colors.dashboard.cardBg }, durationMonths === m && { borderColor: colors.deepGreen, backgroundColor: colors.userVerified }]}
            onPress={() => setDurationMonths(m)}
          >
            <Text style={[styles.chipText, { color: colors.dashboard.textSecondary }, durationMonths === m && { color: colors.deepGreen }]}>
              {m} {t('months')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.dashboard.textPrimary }]}>{t('installmentType')}</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, { borderColor: colors.dashboard.border, backgroundColor: colors.dashboard.cardBg }, installmentType === 'monthly' && { borderColor: colors.deepGreen, backgroundColor: colors.userVerified }]}
          onPress={() => setInstallmentType('monthly')}
        >
          <Feather name="calendar" size={16} color={installmentType === 'monthly' ? colors.deepGreen : colors.dashboard.textSecondary} />
          <Text style={[styles.toggleText, { color: colors.dashboard.textSecondary }, installmentType === 'monthly' && { color: colors.deepGreen }]}>
            {t('monthly')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, { borderColor: colors.dashboard.border, backgroundColor: colors.dashboard.cardBg }, installmentType === 'seasonal' && { borderColor: colors.deepGreen, backgroundColor: colors.userVerified }]}
          onPress={() => setInstallmentType('seasonal')}
        >
          <Feather name="sun" size={16} color={installmentType === 'seasonal' ? colors.deepGreen : colors.dashboard.textSecondary} />
          <Text style={[styles.toggleText, { color: colors.dashboard.textSecondary }, installmentType === 'seasonal' && { color: colors.deepGreen }]}>
            {t('seasonal')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.emiCard, { backgroundColor: colors.dashboard.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 }]}>
        <Text style={[styles.emiTitle, { color: colors.dashboard.textPrimary }]}>{t('emiPreview')}</Text>
        <View style={[styles.emiDivider, { backgroundColor: colors.dashboard.border }]} />
        <View style={styles.emiRow}>
          <Text style={[styles.emiLabel, { color: colors.dashboard.textSecondary }]}>{t('principal')}</Text>
          <Text style={[styles.emiValue, { color: colors.dashboard.textPrimary }]}>৳{amount.toLocaleString('en-BD')}</Text>
        </View>
        <View style={styles.emiRow}>
          <Text style={[styles.emiLabel, { color: colors.dashboard.textSecondary }]}>{t('rate')}</Text>
          <Text style={[styles.emiValue, { color: colors.dashboard.textPrimary }]}>{annualRate}% {t('perAnnum')}</Text>
        </View>
        <View style={styles.emiRow}>
          <Text style={[styles.emiLabel, { color: colors.dashboard.textSecondary }]}>{installmentType === 'monthly' ? t('monthly') : t('seasonal')} {t('emi')}</Text>
          <Text style={[styles.emiValueHighlight, { color: colors.deepGreen }]}>৳{emi.toLocaleString('en-BD')}</Text>
        </View>
      </View>
    </View>
  );
}

function StepDocuments({
  documents, toggleDoc, t, colors,
}: {
  documents: { nid: boolean; landDocument: boolean; farmPhotograph: boolean; previousLoanStatement: boolean };
  toggleDoc: (key: keyof typeof documents) => void;
  t: (key: any) => string;
  colors: any;
}) {
  const docList: { key: keyof typeof documents; labelKey: string; required: boolean }[] = [
    { key: 'nid', labelKey: 'nidCard', required: true },
    { key: 'landDocument', labelKey: 'landRecords', required: true },
    { key: 'farmPhotograph', labelKey: 'farmPhotographs', required: true },
    { key: 'previousLoanStatement', labelKey: 'previousLoanStatement', required: false },
  ];

  return (
    <View>
      <Text style={[styles.sectionLabel, { color: colors.dashboard.textPrimary }]}>{t('requiredDocuments')}</Text>
      {docList.map((doc) => {
        const uploaded = documents[doc.key];
        return (
          <TouchableOpacity
            key={doc.key}
            style={[styles.docCard, { borderColor: colors.dashboard.border, backgroundColor: colors.dashboard.cardBg }, uploaded && { borderColor: '#BBF7D0', backgroundColor: colors.userVerified }]}
            onPress={() => toggleDoc(doc.key)}
            activeOpacity={0.7}
          >
            <View style={styles.docLeft}>
              <View style={[styles.docIcon, { backgroundColor: colors.dashboard.border }, uploaded && { backgroundColor: colors.userVerified }]}>
                {uploaded ? (
                  <Ionicons name="document-text" size={20} color={colors.dashboard.greenUp} />
                ) : (
                  <Feather name="upload" size={20} color={colors.dashboard.textSecondary} />
                )}
              </View>
              <View style={styles.docInfo}>
                <Text style={[styles.docLabel, { color: colors.dashboard.textPrimary }, uploaded && { color: colors.dashboard.greenUp }]}>{t(doc.labelKey)}</Text>
                <Text style={[styles.docStatus, { color: colors.dashboard.textSecondary }]}>
                  {uploaded ? `${t('uploaded')} ✓` : doc.required ? `${t('required')} — ${t('tapToUpload')}` : t('optional')}
                </Text>
              </View>
            </View>
            {uploaded && (
              <View style={styles.docBadge}>
                <Ionicons name="checkmark-circle" size={20} color={colors.dashboard.greenUp} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function StepReview({
  amount, purpose, durationMonths, installmentType, emi, annualRate, totalRepayment, t, colors,
}: {
  amount: number;
  purpose: string;
  durationMonths: number;
  installmentType: InstallmentType;
  emi: number;
  annualRate: number;
  totalRepayment: number;
  t: (key: any) => string;
  colors: any;
}) {
  const monthsLabel = durationMonths === 1 ? `1 ${t('month')}` : `${durationMonths} ${t('months')}`;

  return (
    <View>
      <View style={[styles.reviewCard, { backgroundColor: colors.dashboard.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 }]}>
        <Text style={[styles.reviewTitle, { color: colors.dashboard.textPrimary }]}>{t('reviewApplication')}</Text>
        <View style={[styles.reviewDivider, { backgroundColor: colors.dashboard.border }]} />
        <ReviewRow label={t('loanAmount')} value={`৳${amount.toLocaleString('en-BD')}`} colors={colors} />
        <ReviewRow label={t('loanPurpose')} value={purpose} colors={colors} />
        <ReviewRow label={t('duration')} value={monthsLabel} colors={colors} />
        <ReviewRow label={t('installmentType')} value={installmentType === 'monthly' ? t('monthly') : t('seasonal')} colors={colors} />
        <ReviewRow label={`${installmentType === 'monthly' ? t('monthly') : t('seasonal')} ${t('emi')}`} value={`৳${emi.toLocaleString('en-BD')}`} colors={colors} />
        <ReviewRow label={t('rate')} value={`${annualRate}% ${t('perAnnum')}`} colors={colors} />
        <ReviewRow label={t('totalRepayment')} value={`৳${totalRepayment.toLocaleString('en-BD')}`} highlight colors={colors} />
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.userVerified }]}>
        <Ionicons name="information-circle" size={18} color={colors.deepGreen} />
        <Text style={[styles.infoText, { color: colors.userVerifiedText }]}>
          {t('submitConfirm')}
        </Text>
      </View>
    </View>
  );
}

function ReviewRow({ label, value, highlight, colors }: { label: string; value: string; highlight?: boolean; colors: any }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={[styles.reviewLabel, { color: colors.dashboard.textSecondary }]}>{label}</Text>
      <Text style={[styles.reviewValue, { color: colors.dashboard.textPrimary }, highlight && { color: colors.deepGreen, fontSize: 16, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  stepper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
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
  scrollContent: {
    padding: 18,
    paddingBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    marginTop: 10,
  },
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  purposeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  purposeText: {
    fontSize: 13,
    fontWeight: '600',
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
    flexDirection: 'row',
    gap: 6,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emiCard: {
    borderRadius: 18,
    padding: 18,
    marginTop: 24,
  },
  emiTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emiDivider: {
    height: 1,
    marginVertical: 12,
  },
  emiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  emiLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  emiValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  emiValueHighlight: {
    fontSize: 16,
    fontWeight: '700',
  },
  docCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  docStatus: {
    fontSize: 11,
    marginTop: 2,
  },
  docBadge: {
    marginLeft: 8,
  },
  reviewCard: {
    borderRadius: 18,
    padding: 18,
  },
  reviewTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  reviewDivider: {
    height: 1,
    marginVertical: 14,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  reviewLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
