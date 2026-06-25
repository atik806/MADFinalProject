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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerLogo}>
            <Ionicons name="leaf" size={18} color="#fff" />
          </View>
        </View>

        <View>
          <Text style={styles.title}>{t('newFarmerRegistration')}</Text>
          <Text style={styles.subtitle}>{t('step3of5')}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.stepperContainer}>
          <View style={styles.stepItem}>
            <View style={[styles.stepBar, styles.completedBar]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
            <Text style={styles.completedStepText}>{t('identity')}</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepBar, styles.completedBar]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
            <Text style={styles.completedStepText}>{t('land')}</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepBar, styles.activeBar]} />
            <Text style={styles.activeStepText}>{t('incomeStep')}</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepBar} />
            <Text style={styles.stepText}>{t('loanStep')}</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepBar} />
            <Text style={styles.stepText}>{t('photoStep')}</Text>
          </View>
        </View>

        <Text style={styles.label}>{t('annualFarmingLabel2')}</Text>
        <View style={styles.inputIcon}>
          <Ionicons name="cash-outline" size={22} color="#7B8A8B" />
          <TextInput
            placeholder={t('annualFarmingPlaceholder2')}
            keyboardType="decimal-pad"
            style={styles.iconInput}
            value={formatWithCommas(farmingIncome)}
            onChangeText={(t) => {
              setFarmingIncome(t.replace(/,/g, ""));
              setErrors((p) => ({ ...p, farmingIncome: undefined }));
            }}
          />
        </View>
        {errors.farmingIncome && (
          <Text style={styles.error}>{errors.farmingIncome}</Text>
        )}

        <Text style={styles.label}>{t('otherIncomeSources')}</Text>
        <View style={styles.incomeSourceContainer}>
          {otherSources.map((source, index) => (
            <TouchableOpacity
              key={source.label}
              style={[
                styles.sourceBtn,
                source.selected && styles.sourceBtnActive,
              ]}
              onPress={() => toggleSource(index)}
            >
              <Text
                style={[
                  styles.sourceText,
                  source.selected && styles.sourceTextActive,
                ]}
              >
                {source.selected ? "✓ " : ""}
                {source.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t('otherIncomeLabel2')}</Text>
        <View style={styles.inputIcon}>
          <Ionicons name="wallet-outline" size={22} color="#7B8A8B" />
          <TextInput
            placeholder={t('otherIncomePlaceholder2')}
            keyboardType="decimal-pad"
            style={styles.iconInput}
            value={otherIncome ? formatWithCommas(otherIncome) : otherIncome}
            onChangeText={(t) => {
              setOtherIncome(t.replace(/,/g, ""));
              setErrors((p) => ({ ...p, otherIncome: undefined }));
            }}
          />
        </View>
        {errors.otherIncome && (
          <Text style={styles.error}>{errors.otherIncome}</Text>
        )}

        <Text style={styles.label}>{t('familyMembersLabel')}</Text>
        <View style={styles.inputIcon}>
          <Ionicons name="people-outline" size={22} color="#7B8A8B" />
          <TextInput
            placeholder={t('familyPlaceholder2')}
            keyboardType="number-pad"
            style={styles.iconInput}
            value={familyMembers}
            onChangeText={(t) => {
              setFamilyMembers(t);
              setErrors((p) => ({ ...p, familyMembers: undefined }));
            }}
          />
        </View>
        {errors.familyMembers && (
          <Text style={styles.error}>{errors.familyMembers}</Text>
        )}

        <Text style={styles.label}>{t('occupationLabel2')}</Text>
        <View style={styles.inputIcon}>
          <Ionicons name="briefcase-outline" size={22} color="#7B8A8B" />
          <TextInput
            placeholder={t('occupationPlaceholder2')}
            style={styles.iconInput}
            value={occupation}
            onChangeText={(t) => {
              setOccupation(t);
              setErrors((p) => ({ ...p, occupation: undefined }));
            }}
          />
        </View>
        {errors.occupation && (
          <Text style={styles.error}>{errors.occupation}</Text>
        )}

        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
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
    backgroundColor: "#F3F5F4",
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
    backgroundColor: "#fff",
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
    backgroundColor: "#006847",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
  },
  subtitle: {
    color: "#7B8A8B",
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
    backgroundColor: "#D9E5E1",
    marginBottom: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  activeBar: {
    backgroundColor: "#157A5A",
    height: 6,
  },
  completedBar: {
    backgroundColor: "#157A5A",
    height: 22,
    width: 22,
    borderRadius: 11,
    marginBottom: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  activeStepText: {
    color: "#157A5A",
    fontWeight: "700",
    fontSize: 12,
  },
  completedStepText: {
    color: "#157A5A",
    fontWeight: "700",
    fontSize: 12,
    marginTop: -2,
  },
  stepText: {
    color: "#9AA5A8",
    fontSize: 12,
  },
  label: {
    marginHorizontal: 18,
    marginBottom: 8,
    marginTop: 14,
    fontWeight: "600",
    color: "#425466",
  },
  input: {
    backgroundColor: "#fff",
    height: 60,
    borderRadius: 18,
    marginHorizontal: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E4ECE9",
  },
  inputIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4ECE9",
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
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDE5E2",
  },
  sourceBtnActive: {
    borderColor: "#157A5A",
    borderWidth: 2,
    backgroundColor: "#ECFDF5",
  },
  sourceText: {
    color: "#6B7280",
    fontWeight: "600",
  },
  sourceTextActive: {
    color: "#157A5A",
    fontWeight: "700",
  },
  nextBtn: {
    marginHorizontal: 18,
    marginTop: 30,
    marginBottom: 25,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#157A5A",
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
    color: "#DC2626",
    fontSize: 13,
    marginHorizontal: 22,
    marginTop: 4,
    fontWeight: "500",
  },
});
