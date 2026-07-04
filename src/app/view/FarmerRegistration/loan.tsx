import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "../../../hooks/use-translation";
import { useColors } from "../../../features/officials/shared/constants/theme";

type FormErrors = {
  hasLoan?: string;
  loanAmount?: string;
  loanPurpose?: string;
  loanSource?: string;
};

const loanSources = [
  "ব্যাংক",
  "এনজিও",
  "মাইক্রোফাইন্যান্স",
  "সহযোগী সমিতি",
  "ব্যক্তিগত ঋণ",
  "অন্যান্য",
];

export default function LoanScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const [hasLoan, setHasLoan] = useState<boolean | null>(null);
  const [loanAmount, setLoanAmount] = useState("");
  const [loanPurpose, setLoanPurpose] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (hasLoan === null) {
      newErrors.hasLoan = t('errLoanSelection');
    }

    if (hasLoan === true) {
      if (!loanAmount.trim()) {
        newErrors.loanAmount = t('errLoanAmountRequired');
      } else if (isNaN(Number(loanAmount)) || Number(loanAmount) <= 0) {
        newErrors.loanAmount = t('errLoanAmountValid');
      }

      if (!loanPurpose.trim()) {
        newErrors.loanPurpose = t('errLoanPurposeRequired');
      }

      if (!selectedSource) {
        newErrors.loanSource = t('errLoanSourceRequired');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      router.push("/view/FarmerRegistration/photo");
    }
  };

  const formatWithCommas = (val: string) => {
    if (!val) return val;
    const num = val.replace(/,/g, "");
    if (/^\d+$/.test(num)) {
      return Number(num).toLocaleString("en-IN");
    }
    return val;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.dashboard.bg }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.dashboard.cardBg }]} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.dashboard.textPrimary} />
          </TouchableOpacity>
          <View style={[styles.headerLogo, { backgroundColor: colors.deepGreen }]}>
            <Ionicons name="leaf" size={18} color="#fff" />
          </View>
        </View>

        <View>
          <Text style={[styles.title, { color: colors.dashboard.textPrimary }]}>{t('newFarmerRegistration')}</Text>
          <Text style={[styles.subtitle, { color: colors.dashboard.textSecondary }]}>{t('step4of5')}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.stepperContainer}>
          <View style={styles.stepItem}>
            <View style={[styles.stepBar, styles.completedBar, { backgroundColor: colors.deepGreen }]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
            <Text style={[styles.completedStepText, { color: colors.deepGreen }]}>{t('identity')}</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepBar, styles.completedBar, { backgroundColor: colors.deepGreen }]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
            <Text style={[styles.completedStepText, { color: colors.deepGreen }]}>{t('land')}</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepBar, styles.completedBar, { backgroundColor: colors.deepGreen }]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
            <Text style={[styles.completedStepText, { color: colors.deepGreen }]}>{t('incomeStep')}</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepBar, styles.activeBar, { backgroundColor: colors.deepGreen }]} />
            <Text style={[styles.activeStepText, { color: colors.deepGreen }]}>{t('loanStep')}</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepBar, { backgroundColor: colors.dashboard.border }]} />
            <Text style={[styles.stepText, { color: colors.dashboard.textSecondary }]}>{t('photoStep')}</Text>
          </View>
        </View>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('haveLoan')}</Text>
        <View style={styles.radioRow}>
          <TouchableOpacity
            style={[styles.radioBtn, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }, hasLoan === true && { borderColor: colors.deepGreen, borderWidth: 2, backgroundColor: colors.userVerified }]}
            onPress={() => { setHasLoan(true); setErrors((p) => ({ ...p, hasLoan: undefined })); }}
          >
            <Ionicons
              name={hasLoan === true ? "radio-button-on" : "radio-button-off"}
              size={22}
              color={hasLoan === true ? colors.deepGreen : colors.dashboard.textSecondary}
            />
            <Text style={[styles.radioText, { color: colors.dashboard.textSecondary }, hasLoan === true && { color: colors.deepGreen, fontWeight: '700' }]}>
              {t('yes')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.radioBtn, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }, hasLoan === false && { borderColor: colors.deepGreen, borderWidth: 2, backgroundColor: colors.userVerified }]}
            onPress={() => { setHasLoan(false); setErrors((p) => ({ ...p, hasLoan: undefined })); }}
          >
            <Ionicons
              name={hasLoan === false ? "radio-button-on" : "radio-button-off"}
              size={22}
              color={hasLoan === false ? colors.deepGreen : colors.dashboard.textSecondary}
            />
            <Text style={[styles.radioText, { color: colors.dashboard.textSecondary }, hasLoan === false && { color: colors.deepGreen, fontWeight: '700' }]}>
              {t('no')}
            </Text>
          </TouchableOpacity>
        </View>
        {errors.hasLoan && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.hasLoan}</Text>}

        {hasLoan === true && (
          <>
            <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('loanAmountLabel3')}</Text>
            <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
              <Ionicons name="trending-down-outline" size={22} color={colors.dashboard.textSecondary} />
              <TextInput
                placeholder={t('loanAmountPlaceholder2')}
                placeholderTextColor={colors.dashboard.textSecondary}
                keyboardType="decimal-pad"
                style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
                value={formatWithCommas(loanAmount)}
                onChangeText={(t) => {
                  setLoanAmount(t.replace(/,/g, ""));
                  setErrors((p) => ({ ...p, loanAmount: undefined }));
                }}
              />
            </View>
            {errors.loanAmount && (
              <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.loanAmount}</Text>
            )}

            <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('loanPurposeLabel')}</Text>
            <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
              <Ionicons name="flag-outline" size={22} color={colors.dashboard.textSecondary} />
              <TextInput
                placeholder={t('loanPurposePlaceholder')}
                placeholderTextColor={colors.dashboard.textSecondary}
                style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
                value={loanPurpose}
                onChangeText={(t) => {
                  setLoanPurpose(t);
                  setErrors((p) => ({ ...p, loanPurpose: undefined }));
                }}
              />
            </View>
            {errors.loanPurpose && (
              <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.loanPurpose}</Text>
            )}

            <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('loanSourceLabel')}</Text>
            <View style={styles.sourceContainer}>
              {loanSources.map((source) => (
                <TouchableOpacity
                  key={source}
                  style={[styles.sourceBtn, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }, selectedSource === source && { borderColor: colors.deepGreen, borderWidth: 2, backgroundColor: colors.userVerified }]}
                  onPress={() => { setSelectedSource(source); setErrors((p) => ({ ...p, loanSource: undefined })); }}
                >
                  <Text style={[styles.sourceText, { color: colors.dashboard.textSecondary }, selectedSource === source && { color: colors.deepGreen, fontWeight: '700' }]}>
                    {selectedSource === source ? "✓ " : ""}
                    {source}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.loanSource && (
              <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.loanSource}</Text>
            )}
          </>
        )}

        {hasLoan === false && (
          <View style={[styles.noLoanBanner, { backgroundColor: colors.userVerified, borderColor: '#A7F3D0' }]}>
            <Ionicons name="checkmark-circle" size={48} color={colors.deepGreen} />
            <Text style={[styles.noLoanText, { color: colors.deepGreen }]}>
              {t('noLoanMessage')}
            </Text>
          </View>
        )}

        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: colors.deepGreen }]} onPress={handleNext}>
          <Text style={styles.nextBtnText}>{t('nextStep')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 10,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    marginVertical: 20,
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
  },
  stepBar: {
    width: "90%",
    height: 6,
    borderRadius: 20,
    marginBottom: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  activeBar: {
    height: 6,
  },
  completedBar: {
    height: 22,
    width: 22,
    borderRadius: 11,
    marginBottom: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  activeStepText: {
    fontWeight: "700",
    fontSize: 12,
  },
  completedStepText: {
    fontWeight: "700",
    fontSize: 12,
    marginTop: -2,
  },
  stepText: {
    fontSize: 12,
  },
  label: {
    marginHorizontal: 18,
    marginBottom: 8,
    marginTop: 14,
    fontWeight: "600",
  },
  inputIcon: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 18,
    paddingHorizontal: 16,
  },
  iconInput: {
    flex: 1,
    marginLeft: 12,
  },
  radioRow: {
    flexDirection: "row",
    marginHorizontal: 18,
    marginTop: 8,
    gap: 12,
  },
  radioBtn: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    gap: 8,
  },
  radioText: {
    fontWeight: "600",
    fontSize: 16,
  },
  sourceContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 18,
    marginTop: 8,
    gap: 8,
  },
  sourceBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  sourceText: {
    fontWeight: "600",
  },
  noLoanBanner: {
    alignItems: "center",
    marginTop: 30,
    padding: 24,
    marginHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  noLoanText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  nextBtn: {
    marginHorizontal: 18,
    marginTop: 30,
    marginBottom: 25,
    height: 60,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 6,
  },
  error: {
    fontSize: 13,
    marginHorizontal: 22,
    marginTop: 4,
    fontWeight: "500",
  },
});
