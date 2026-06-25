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

type Step = 1 | 2 | 3;
type InstallmentType = 'monthly' | 'seasonal';

const amountPresets = [25000, 50000, 75000, 100000];
const purposes = [
  'Boro Rice Cultivation',
  'Aus/Aman Cultivation',
  'Vegetable Farming',
  'Fish/Shrimp Farming',
  'Livestock Purchase',
  'Irrigation System',
  'Farm Equipment',
  'Other',
];
const durationPresets = [3, 6, 9, 12];

function calculateEMI(principal: number, months: number, annualRate: number): number {
  if (months === 0) return 0;
  const r = annualRate / 12 / 100;
  const pow = Math.pow(1 + r, months);
  return Math.round(principal * r * pow / (pow - 1));
}

export default function ApplyLoanScreen() {
  const { addApplication } = useLoans();
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleBackStep} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerLogo}>
            <Ionicons name="leaf" size={18} color="#fff" />
          </View>
        </View>
        <Text style={styles.headerTitle}>Apply for Loan</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.stepper}>
        {([1, 2, 3] as const).map((s) => {
          const isDone = s < step;
          const isCurrent = s === step;
          return (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepCircle, isDone && styles.stepCircleDone, isCurrent && styles.stepCircleCurrent]}>
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text style={[styles.stepNum, isCurrent && styles.stepNumCurrent]}>{s}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, isCurrent && styles.stepLabelCurrent]}>
                {s === 1 ? 'Loan Details' : s === 2 ? 'Documents' : 'Review'}
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
          />
        )}
        {step === 2 && (
          <StepDocuments
            documents={documents}
            toggleDoc={toggleDoc}
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
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step < 3 && (
          <TouchableOpacity
            style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
            onPress={handleNext}
            disabled={!canContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>
              {step === 2 ? 'Next: Review →' : 'Next: Upload Documents →'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        )}
        {step === 3 && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>Submit Application</Text>
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
  emi, annualRate,
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
}) {
  return (
    <View>
      <Text style={styles.sectionLabel}>Loan Amount (৳)</Text>
      <View style={styles.chipRow}>
        {amountPresets.map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[styles.chip, amount === preset && !customAmount && styles.chipActive]}
            onPress={() => { setAmount(preset); setCustomAmount(''); }}
          >
            <Text style={[styles.chipText, amount === preset && !customAmount && styles.chipTextActive]}>
              ৳{preset.toLocaleString('en-BD')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={[styles.input, customAmount.length > 0 && styles.inputActive]}
        placeholder="Custom amount"
        placeholderTextColor="#9CA3AF"
        keyboardType="decimal-pad"
        value={customAmount}
        onChangeText={(v) => { setCustomAmount(v); const n = parseInt(v.replace(/,/g, ''), 10); if (!isNaN(n)) setAmount(n); }}
      />

      <Text style={styles.sectionLabel}>Loan Purpose</Text>
      <View style={styles.purposeGrid}>
        {purposes.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.purposeBtn, purpose === p && styles.purposeBtnActive]}
            onPress={() => setPurpose(p)}
          >
            <Text style={[styles.purposeText, purpose === p && styles.purposeTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Duration</Text>
      <View style={styles.chipRow}>
        {durationPresets.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.chip, durationMonths === m && styles.chipActive]}
            onPress={() => setDurationMonths(m)}
          >
            <Text style={[styles.chipText, durationMonths === m && styles.chipTextActive]}>
              {m} mo
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Installment Type</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, installmentType === 'monthly' && styles.toggleBtnActive]}
          onPress={() => setInstallmentType('monthly')}
        >
          <Feather name="calendar" size={16} color={installmentType === 'monthly' ? '#006847' : '#6B7280'} />
          <Text style={[styles.toggleText, installmentType === 'monthly' && styles.toggleTextActive]}>
            Monthly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, installmentType === 'seasonal' && styles.toggleBtnActive]}
          onPress={() => setInstallmentType('seasonal')}
        >
          <Feather name="sun" size={16} color={installmentType === 'seasonal' ? '#006847' : '#6B7280'} />
          <Text style={[styles.toggleText, installmentType === 'seasonal' && styles.toggleTextActive]}>
            Seasonal
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.emiCard}>
        <Text style={styles.emiTitle}>EMI Preview</Text>
        <View style={styles.emiDivider} />
        <View style={styles.emiRow}>
          <Text style={styles.emiLabel}>Principal</Text>
          <Text style={styles.emiValue}>৳{amount.toLocaleString('en-BD')}</Text>
        </View>
        <View style={styles.emiRow}>
          <Text style={styles.emiLabel}>Rate</Text>
          <Text style={styles.emiValue}>{annualRate}% p.a.</Text>
        </View>
        <View style={styles.emiRow}>
          <Text style={styles.emiLabel}>{installmentType === 'monthly' ? 'Monthly' : 'Seasonal'} EMI</Text>
          <Text style={styles.emiValueHighlight}>৳{emi.toLocaleString('en-BD')}</Text>
        </View>
      </View>
    </View>
  );
}

function StepDocuments({
  documents, toggleDoc,
}: {
  documents: { nid: boolean; landDocument: boolean; farmPhotograph: boolean; previousLoanStatement: boolean };
  toggleDoc: (key: keyof typeof documents) => void;
}) {
  const docList: { key: keyof typeof documents; label: string; required: boolean }[] = [
    { key: 'nid', label: 'National ID Card (NID)', required: true },
    { key: 'landDocument', label: 'Land Ownership Document', required: true },
    { key: 'farmPhotograph', label: 'Farm Photograph', required: true },
    { key: 'previousLoanStatement', label: 'Previous Loan Statement', required: false },
  ];

  return (
    <View>
      <Text style={styles.sectionLabel}>Required Documents</Text>
      {docList.map((doc) => {
        const uploaded = documents[doc.key];
        return (
          <TouchableOpacity
            key={doc.key}
            style={[styles.docCard, uploaded && styles.docCardDone]}
            onPress={() => toggleDoc(doc.key)}
            activeOpacity={0.7}
          >
            <View style={styles.docLeft}>
              <View style={[styles.docIcon, uploaded && styles.docIconDone]}>
                {uploaded ? (
                  <Ionicons name="document-text" size={20} color="#16A34A" />
                ) : (
                  <Feather name="upload" size={20} color="#6B7280" />
                )}
              </View>
              <View style={styles.docInfo}>
                <Text style={[styles.docLabel, uploaded && styles.docLabelDone]}>{doc.label}</Text>
                <Text style={styles.docStatus}>
                  {uploaded ? 'Uploaded ✓' : doc.required ? 'Required — tap to upload' : 'Optional'}
                </Text>
              </View>
            </View>
            {uploaded && (
              <View style={styles.docBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function StepReview({
  amount, purpose, durationMonths, installmentType, emi, annualRate, totalRepayment,
}: {
  amount: number;
  purpose: string;
  durationMonths: number;
  installmentType: InstallmentType;
  emi: number;
  annualRate: number;
  totalRepayment: number;
}) {
  const monthsLabel = durationMonths === 1 ? '1 month' : `${durationMonths} months`;

  return (
    <View>
      <View style={styles.reviewCard}>
        <Text style={styles.reviewTitle}>Review Application</Text>
        <View style={styles.reviewDivider} />
        <ReviewRow label="Loan Amount" value={`৳${amount.toLocaleString('en-BD')}`} />
        <ReviewRow label="Purpose" value={purpose} />
        <ReviewRow label="Duration" value={monthsLabel} />
        <ReviewRow label="Installment Type" value={installmentType === 'monthly' ? 'Monthly' : 'Seasonal'} />
        <ReviewRow label={`${installmentType === 'monthly' ? 'Monthly' : 'Seasonal'} EMI`} value={`৳${emi.toLocaleString('en-BD')}`} />
        <ReviewRow label="Interest Rate" value={`${annualRate}% per annum`} />
        <ReviewRow label="Total Repayment" value={`৳${totalRepayment.toLocaleString('en-BD')}`} highlight />
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={18} color="#006847" />
        <Text style={styles.infoText}>
          By submitting, you confirm all information is accurate. Your application will be reviewed within 3–5 business days.
        </Text>
      </View>
    </View>
  );
}

function ReviewRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={[styles.reviewValue, highlight && styles.reviewValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#006847',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#006847',
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
    color: '#006847',
    fontWeight: '700',
  },

  scrollContent: {
    padding: 18,
    paddingBottom: 20,
  },

  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
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
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    borderColor: '#006847',
    backgroundColor: '#ECFDF5',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  chipTextActive: {
    color: '#006847',
  },

  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#fff',
    marginTop: 10,
  },
  inputActive: {
    borderColor: '#006847',
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
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  purposeBtnActive: {
    borderColor: '#006847',
    backgroundColor: '#ECFDF5',
  },
  purposeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  purposeTextActive: {
    color: '#006847',
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
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: '#fff',
    gap: 6,
  },
  toggleBtnActive: {
    borderColor: '#006847',
    backgroundColor: '#ECFDF5',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleTextActive: {
    color: '#006847',
  },

  emiCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginTop: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  emiTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  emiDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
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
    color: '#6B7280',
    fontWeight: '500',
  },
  emiValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  emiValueHighlight: {
    fontSize: 16,
    color: '#006847',
    fontWeight: '700',
  },

  docCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  docCardDone: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
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
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docIconDone: {
    backgroundColor: '#ECFDF5',
  },
  docInfo: {
    flex: 1,
  },
  docLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  docLabelDone: {
    color: '#16A34A',
  },
  docStatus: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  docBadge: {
    marginLeft: 8,
  },

  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  reviewTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  reviewDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
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
    color: '#6B7280',
    fontWeight: '500',
  },
  reviewValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  reviewValueHighlight: {
    fontSize: 16,
    color: '#006847',
    fontWeight: '700',
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
    lineHeight: 20,
    fontWeight: '500',
  },

  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#006847',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
