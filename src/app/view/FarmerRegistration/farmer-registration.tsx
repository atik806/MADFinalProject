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
  nameBn?: string;
  nameEn?: string;
  nid?: string;
  phone?: string;
  dob?: string;
};

export default function FarmerRegistrationScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const [nameBn, setNameBn] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nid, setNid] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState(t('male'));
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!nameBn.trim()) {
      newErrors.nameBn = t('errNameBnRequired');
    }

    if (!nameEn.trim()) {
      newErrors.nameEn = t('errNameEnRequired');
    }

    if (!nid.trim()) {
      newErrors.nid = t('errNidRequired');
    } else if (!/^\d{10}$/.test(nid) && !/^\d{17}$/.test(nid)) {
      newErrors.nid = t('errNidFormat');
    }

    if (!phone.trim()) {
      newErrors.phone = t('errPhoneRequired');
    } else if (!/^1\d{9}$/.test(phone)) {
      newErrors.phone = t('errPhoneFormat');
    }

    if (!dob.trim()) {
      newErrors.dob = t('errDobRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      router.push("/view/FarmerRegistration/land");
    }
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
          <Text style={[styles.subtitle, { color: colors.dashboard.textSecondary }]}>{t('step1of5')}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.stepperContainer}>
          <View style={styles.stepItem}>
            <View style={[styles.stepBar, styles.activeBar, { backgroundColor: colors.deepGreen }]} />
            <Text style={[styles.activeStepText, { color: colors.deepGreen }]}>{t('identity')}</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepBar, { backgroundColor: colors.dashboard.border }]} />
            <Text style={[styles.stepText, { color: colors.dashboard.textSecondary }]}>{t('land')}</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepBar, { backgroundColor: colors.dashboard.border }]} />
            <Text style={[styles.stepText, { color: colors.dashboard.textSecondary }]}>{t('incomeStep')}</Text>
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

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('fullNameBn')}</Text>
        <TextInput
          placeholder={t('nameBnPlaceholder2')}
          placeholderTextColor={colors.dashboard.textSecondary}
          style={[styles.input, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary }]}
          value={nameBn}
          onChangeText={(t) => { setNameBn(t); setErrors((p) => ({ ...p, nameBn: undefined })); }}
        />
        {errors.nameBn && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.nameBn}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('fullNameEn')}</Text>
        <TextInput
          placeholder={t('nameEnPlaceholder2')}
          placeholderTextColor={colors.dashboard.textSecondary}
          style={[styles.input, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary }]}
          value={nameEn}
          onChangeText={(t) => { setNameEn(t); setErrors((p) => ({ ...p, nameEn: undefined })); }}
        />
        {errors.nameEn && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.nameEn}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('nidNumber')}</Text>

        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="document-text-outline" size={22} color={colors.dashboard.textSecondary} />
          <TextInput
            placeholder={t('nidPlaceholder2')}
            placeholderTextColor={colors.dashboard.textSecondary}
            keyboardType="number-pad"
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={nid}
            onChangeText={(t) => { setNid(t); setErrors((p) => ({ ...p, nid: undefined })); }}
          />
        </View>
        {errors.nid && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.nid}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('mobileNumber')}</Text>

        <View style={styles.phoneContainer}>
          <View style={[styles.countryCode, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
            <Text style={[styles.countryCodeText, { color: colors.dashboard.textPrimary }]}>+880</Text>
          </View>

          <TextInput
            placeholder={t('mobilePlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
            keyboardType="phone-pad"
            style={[styles.phoneInput, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary }]}
            value={phone}
            onChangeText={(t) => { setPhone(t); setErrors((p) => ({ ...p, phone: undefined })); }}
          />
        </View>
        {errors.phone && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.phone}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('dateOfBirthLabel')}</Text>

        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="calendar-outline" size={22} color={colors.dashboard.textSecondary} />
          <TextInput
            placeholder={t('dobPlaceholder2')}
            placeholderTextColor={colors.dashboard.textSecondary}
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={dob}
            onChangeText={(t) => { setDob(t); setErrors((p) => ({ ...p, dob: undefined })); }}
          />
        </View>
        {errors.dob && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.dob}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('genderLabel2')}</Text>

        <View style={styles.genderRow}>
          {[t('male'), t('female'), t('other')].map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.genderBtn, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }, gender === item && { borderColor: colors.deepGreen, borderWidth: 2, backgroundColor: colors.userVerified }]}
              onPress={() => setGender(item)}
            >
              <Text style={[styles.genderText, { color: colors.dashboard.textSecondary }, gender === item && { color: colors.deepGreen, fontWeight: '700' }]}>
                {gender === item ? "✓ " : ""}
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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
  },
  activeBar: {
    height: 6,
  },
  activeStepText: {
    fontWeight: "700",
    fontSize: 12,
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
  input: {
    height: 60,
    borderRadius: 18,
    marginHorizontal: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
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
  phoneContainer: {
    flexDirection: "row",
    marginHorizontal: 18,
  },
  countryCode: {
    width: 75,
    height: 60,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  countryCodeText: {
    fontWeight: "700",
    fontSize: 16,
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    paddingHorizontal: 16,
  },
  genderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 18,
    marginTop: 8,
  },
  genderBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },
  genderText: {
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
