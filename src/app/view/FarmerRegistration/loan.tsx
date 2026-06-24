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
  const [hasLoan, setHasLoan] = useState<boolean | null>(null);
  const [loanAmount, setLoanAmount] = useState("");
  const [loanPurpose, setLoanPurpose] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (hasLoan === null) {
      newErrors.hasLoan = "অনুগ্রহ করে নির্বাচন করুন";
    }

    if (hasLoan === true) {
      if (!loanAmount.trim()) {
        newErrors.loanAmount = "ঋণের পরিমাণ লিখুন";
      } else if (isNaN(Number(loanAmount)) || Number(loanAmount) <= 0) {
        newErrors.loanAmount = "সঠিক পরিমাণ লিখুন";
      }

      if (!loanPurpose.trim()) {
        newErrors.loanPurpose = "ঋণের উদ্দেশ্য লিখুন";
      }

      if (!selectedSource) {
        newErrors.loanSource = "ঋণের উৎস নির্বাচন করুন";
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1F2937" />
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>নতুন কৃষক নিবন্ধন</Text>
          <Text style={styles.subtitle}>ধাপ ৪ / ৫ — ঋণ সংক্রান্ত তথ্য</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.stepperContainer}>
          <View style={styles.stepItem}>
            <View style={[styles.stepBar, styles.completedBar]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
            <Text style={styles.completedStepText}>পরিচয়</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepBar, styles.completedBar]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
            <Text style={styles.completedStepText}>জমি</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepBar, styles.completedBar]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
            <Text style={styles.completedStepText}>আয়</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepBar, styles.activeBar]} />
            <Text style={styles.activeStepText}>ঋণ</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepBar} />
            <Text style={styles.stepText}>ছবি</Text>
          </View>
        </View>

        <Text style={styles.label}>বর্তমানে কোন ঋণ আছে?</Text>
        <View style={styles.radioRow}>
          <TouchableOpacity
            style={[
              styles.radioBtn,
              hasLoan === true && styles.radioBtnActive,
            ]}
            onPress={() => { setHasLoan(true); setErrors((p) => ({ ...p, hasLoan: undefined })); }}
          >
            <Ionicons
              name={hasLoan === true ? "radio-button-on" : "radio-button-off"}
              size={22}
              color={hasLoan === true ? "#157A5A" : "#7B8A8B"}
            />
            <Text
              style={[
                styles.radioText,
                hasLoan === true && styles.radioTextActive,
              ]}
            >
              হ্যাঁ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.radioBtn,
              hasLoan === false && styles.radioBtnActive,
            ]}
            onPress={() => { setHasLoan(false); setErrors((p) => ({ ...p, hasLoan: undefined })); }}
          >
            <Ionicons
              name={hasLoan === false ? "radio-button-on" : "radio-button-off"}
              size={22}
              color={hasLoan === false ? "#157A5A" : "#7B8A8B"}
            />
            <Text
              style={[
                styles.radioText,
                hasLoan === false && styles.radioTextActive,
              ]}
            >
              না
            </Text>
          </TouchableOpacity>
        </View>
        {errors.hasLoan && <Text style={styles.error}>{errors.hasLoan}</Text>}

        {hasLoan === true && (
          <>
            <Text style={styles.label}>ঋণের পরিমাণ (টাকা)</Text>
            <View style={styles.inputIcon}>
              <Ionicons name="trending-down-outline" size={22} color="#7B8A8B" />
              <TextInput
                placeholder="যেমন: ৫০,০০০"
                keyboardType="decimal-pad"
                style={styles.iconInput}
                value={formatWithCommas(loanAmount)}
                onChangeText={(t) => {
                  setLoanAmount(t.replace(/,/g, ""));
                  setErrors((p) => ({ ...p, loanAmount: undefined }));
                }}
              />
            </View>
            {errors.loanAmount && (
              <Text style={styles.error}>{errors.loanAmount}</Text>
            )}

            <Text style={styles.label}>ঋণের উদ্দেশ্য</Text>
            <View style={styles.inputIcon}>
              <Ionicons name="flag-outline" size={22} color="#7B8A8B" />
              <TextInput
                placeholder="যেমন: কৃষি কাজ, গবাদি পশু"
                style={styles.iconInput}
                value={loanPurpose}
                onChangeText={(t) => {
                  setLoanPurpose(t);
                  setErrors((p) => ({ ...p, loanPurpose: undefined }));
                }}
              />
            </View>
            {errors.loanPurpose && (
              <Text style={styles.error}>{errors.loanPurpose}</Text>
            )}

            <Text style={styles.label}>ঋণের উৎস</Text>
            <View style={styles.sourceContainer}>
              {loanSources.map((source) => (
                <TouchableOpacity
                  key={source}
                  style={[
                    styles.sourceBtn,
                    selectedSource === source && styles.sourceBtnActive,
                  ]}
                  onPress={() => { setSelectedSource(source); setErrors((p) => ({ ...p, loanSource: undefined })); }}
                >
                  <Text
                    style={[
                      styles.sourceText,
                      selectedSource === source && styles.sourceTextActive,
                    ]}
                  >
                    {selectedSource === source ? "✓ " : ""}
                    {source}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.loanSource && (
              <Text style={styles.error}>{errors.loanSource}</Text>
            )}
          </>
        )}

        {hasLoan === false && (
          <View style={styles.noLoanBanner}>
            <Ionicons name="checkmark-circle" size={48} color="#157A5A" />
            <Text style={styles.noLoanText}>
              ভালো আছেন! কোনো ঋণের তথ্য নেই।
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>পরবর্তী ধাপ</Text>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottomNav}>
        <NavItem icon="home-outline" text="Home" />
        <NavItem icon="people-outline" text="Farmers" active />
        <NavItem icon="swap-horizontal-outline" text="Transactions" />
        <NavItem icon="notifications-outline" text="Alerts" />
        <NavItem icon="person-outline" text="Profile" />
      </View>
    </SafeAreaView>
  );
}

type NavItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  active?: boolean;
};

const NavItem = ({ icon, text, active }: NavItemProps) => (
  <TouchableOpacity style={styles.navItem}>
    <Ionicons
      name={icon}
      size={22}
      color={active ? "#157A5A" : "#7B8A8B"}
    />
    <Text
      style={[
        styles.navText,
        active && { color: "#157A5A", fontWeight: "700" },
      ]}
    >
      {text}
    </Text>
  </TouchableOpacity>
);

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
    backgroundColor: "#fff",
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DDE5E2",
    justifyContent: "center",
    gap: 8,
  },
  radioBtnActive: {
    borderColor: "#157A5A",
    borderWidth: 2,
    backgroundColor: "#ECFDF5",
  },
  radioText: {
    color: "#6B7280",
    fontWeight: "600",
    fontSize: 16,
  },
  radioTextActive: {
    color: "#157A5A",
    fontWeight: "700",
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
  noLoanBanner: {
    alignItems: "center",
    marginTop: 30,
    padding: 24,
    backgroundColor: "#ECFDF5",
    marginHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  noLoanText: {
    color: "#157A5A",
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
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
  },
  navItem: {
    alignItems: "center",
  },
  navText: {
    fontSize: 11,
    marginTop: 4,
    color: "#7B8A8B",
  },
});
