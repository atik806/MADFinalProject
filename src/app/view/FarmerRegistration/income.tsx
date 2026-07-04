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

type IncomeSource = {
  label: string;
  selected: boolean;
};

type FormErrors = {
  farmingIncome?: string;
  otherIncome?: string;
  familyMembers?: string;
  occupation?: string;
};

export default function IncomeScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const [farmingIncome, setFarmingIncome] = useState("");
  const [otherIncome, setOtherIncome] = useState("");
  const [familyMembers, setFamilyMembers] = useState("");
  const [occupation, setOccupation] = useState("");
  const [otherSources, setOtherSources] = useState<IncomeSource[]>([
    { label: "কৃষি শ্রমিক", selected: false },
    { label: "ছোট ব্যবসা", selected: false },
    { label: "চাকরি", selected: false },
    { label: "অন্যান্য", selected: false },
  ]);
  const [errors, setErrors] = useState<FormErrors>({});

  const toggleSource = (index: number) => {
    setOtherSources((prev) =>
      prev.map((s, i) => (i === index ? { ...s, selected: !s.selected } : s))
    );
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!farmingIncome.trim()) {
      newErrors.farmingIncome = t('errFarmingIncomeRequired');
    } else if (isNaN(Number(farmingIncome)) || Number(farmingIncome) <= 0) {
      newErrors.farmingIncome = t('errFarmingIncomeValid');
    }

    if (otherIncome && (isNaN(Number(otherIncome)) || Number(otherIncome) < 0)) {
      newErrors.otherIncome = t('errOtherIncomeValid');
    }

    if (!familyMembers.trim()) {
      newErrors.familyMembers = t('errFamilyRequired');
    } else if (isNaN(Number(familyMembers)) || Number(familyMembers) <= 0) {
      newErrors.familyMembers = t('errFamilyValid');
    }

    if (!occupation.trim()) {
      newErrors.occupation = t('errOccupationRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      router.push("/view/FarmerRegistration/loan");
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
          <Text style={[styles.subtitle, { color: colors.dashboard.textSecondary }]}>{t('step3of5')}</Text>
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
            <View style={[styles.stepBar, styles.activeBar, { backgroundColor: colors.deepGreen }]} />
            <Text style={[styles.activeStepText, { color: colors.deepGreen }]}>{t('incomeStep')}</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepBar, { backgroundColor: colors.dashboard.border }]} />
            <Text style={[styles.stepText, { color: colors.dashboard.textSecondary }]}>{t('loanStep')}</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepBar, { backgroundColor: colors.dashboard.border }]} />
            <Text style={[styles.stepText, { color: colors.dashboard.textSecondary }]}>{t('photoStep')}</Text>
          </View>
        </View>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('annualFarmingLabel2')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="cash-outline" size={22} color={colors.dashboard.textSecondary} />
          <TextInput
            placeholder={t('annualFarmingPlaceholder2')}
            placeholderTextColor={colors.dashboard.textSecondary}
            keyboardType="decimal-pad"
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={formatWithCommas(farmingIncome)}
            onChangeText={(t) => {
              setFarmingIncome(t.replace(/,/g, ""));
              setErrors((p) => ({ ...p, farmingIncome: undefined }));
            }}
          />
        </View>
        {errors.farmingIncome && (
          <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.farmingIncome}</Text>
        )}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('otherIncomeSources')}</Text>
        <View style={styles.incomeSourceContainer}>
          {otherSources.map((source, index) => (
            <TouchableOpacity
              key={source.label}
              style={[styles.sourceBtn, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }, source.selected && { borderColor: colors.deepGreen, borderWidth: 2, backgroundColor: colors.userVerified }]}
              onPress={() => toggleSource(index)}
            >
              <Text style={[styles.sourceText, { color: colors.dashboard.textSecondary }, source.selected && { color: colors.deepGreen, fontWeight: '700' }]}>
                {source.selected ? "✓ " : ""}
                {source.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('otherIncomeLabel2')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="wallet-outline" size={22} color={colors.dashboard.textSecondary} />
          <TextInput
            placeholder={t('otherIncomePlaceholder2')}
            placeholderTextColor={colors.dashboard.textSecondary}
            keyboardType="decimal-pad"
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={otherIncome ? formatWithCommas(otherIncome) : otherIncome}
            onChangeText={(t) => {
              setOtherIncome(t.replace(/,/g, ""));
              setErrors((p) => ({ ...p, otherIncome: undefined }));
            }}
          />
        </View>
        {errors.otherIncome && (
          <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.otherIncome}</Text>
        )}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('familyMembersLabel')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="people-outline" size={22} color={colors.dashboard.textSecondary} />
          <TextInput
            placeholder={t('familyPlaceholder2')}
            placeholderTextColor={colors.dashboard.textSecondary}
            keyboardType="number-pad"
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={familyMembers}
            onChangeText={(t) => {
              setFamilyMembers(t);
              setErrors((p) => ({ ...p, familyMembers: undefined }));
            }}
          />
        </View>
        {errors.familyMembers && (
          <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.familyMembers}</Text>
        )}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('occupationLabel2')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="briefcase-outline" size={22} color={colors.dashboard.textSecondary} />
          <TextInput
            placeholder={t('occupationPlaceholder2')}
            placeholderTextColor={colors.dashboard.textSecondary}
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={occupation}
            onChangeText={(t) => {
              setOccupation(t);
              setErrors((p) => ({ ...p, occupation: undefined }));
            }}
          />
        </View>
        {errors.occupation && (
          <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.occupation}</Text>
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
  incomeSourceContainer: {
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
