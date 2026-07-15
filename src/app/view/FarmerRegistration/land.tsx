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
import { REGISTRATION_CROPS } from '@/data';

type FormErrors = {
  totalLand?: string;
  ownLand?: string;
  crops?: string;
  location?: string;
};

export default function LandScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const [totalLand, setTotalLand] = useState("");
  const [ownLand, setOwnLand] = useState("");
  const [leasedLand, setLeasedLand] = useState("");
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const toggleCrop = (crop: string) => {
    setSelectedCrops((prev) =>
      prev.includes(crop)
        ? prev.filter((c) => c !== crop)
        : [...prev, crop]
    );
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!totalLand.trim()) {
      newErrors.totalLand = t('errTotalLandRequired');
    } else if (isNaN(Number(totalLand)) || Number(totalLand) <= 0) {
      newErrors.totalLand = t('errTotalLandValid');
    }

    if (!ownLand.trim()) {
      newErrors.ownLand = t('errOwnLandRequired');
    } else if (isNaN(Number(ownLand)) || Number(ownLand) < 0) {
      newErrors.ownLand = t('errOwnLandValid');
    }

    if (selectedCrops.length === 0) {
      newErrors.crops = t('errCropsRequired');
    }

    if (!location.trim()) {
      newErrors.location = t('errLocationRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      router.push("/view/FarmerRegistration/income");
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
          <Text style={[styles.subtitle, { color: colors.dashboard.textSecondary }]}>{t('step2of5')}</Text>
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
            <View style={[styles.stepBar, styles.activeBar, { backgroundColor: colors.deepGreen }]} />
            <Text style={[styles.activeStepText, { color: colors.deepGreen }]}>{t('land')}</Text>
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

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('totalLandLabel2')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="map-outline" size={22} color={colors.dashboard.textSecondary} />
          <TextInput
            placeholder={t('totalLandPlaceholder2')}
            placeholderTextColor={colors.dashboard.textSecondary}
            keyboardType="decimal-pad"
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={totalLand}
            onChangeText={(t) => { setTotalLand(t); setErrors((p) => ({ ...p, totalLand: undefined })); }}
          />
        </View>
        {errors.totalLand && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.totalLand}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('ownLandLabel2')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="home-outline" size={22} color={colors.dashboard.textSecondary} />
          <TextInput
            placeholder={t('ownLandPlaceholder2')}
            placeholderTextColor={colors.dashboard.textSecondary}
            keyboardType="decimal-pad"
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={ownLand}
            onChangeText={(t) => { setOwnLand(t); setErrors((p) => ({ ...p, ownLand: undefined })); }}
          />
        </View>
        {errors.ownLand && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.ownLand}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('leasedLandLabel2')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="document-outline" size={22} color={colors.dashboard.textSecondary} />
          <TextInput
            placeholder={t('leasedLandPlaceholder2')}
            placeholderTextColor={colors.dashboard.textSecondary}
            keyboardType="decimal-pad"
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={leasedLand}
            onChangeText={setLeasedLand}
          />
        </View>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('selectCrops')}</Text>
        <View style={styles.cropContainer}>
          {REGISTRATION_CROPS.map((crop) => (
            <TouchableOpacity
              key={crop}
              style={[styles.cropBtn, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }, selectedCrops.includes(crop) && { borderColor: colors.deepGreen, borderWidth: 2, backgroundColor: colors.userVerified }]}
              onPress={() => toggleCrop(crop)}
            >
              <Text style={[styles.cropText, { color: colors.dashboard.textSecondary }, selectedCrops.includes(crop) && { color: colors.deepGreen, fontWeight: '700' }]}>
                {selectedCrops.includes(crop) ? "✓ " : ""}
                {crop}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.crops && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.crops}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('locationLabel2')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="location-outline" size={22} color={colors.dashboard.textSecondary} />
          <TextInput
            placeholder={t('locationPlaceholder2')}
            placeholderTextColor={colors.dashboard.textSecondary}
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={location}
            onChangeText={(t) => { setLocation(t); setErrors((p) => ({ ...p, location: undefined })); }}
          />
        </View>
        {errors.location && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.location}</Text>}

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
  cropContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 18,
    marginTop: 8,
    gap: 8,
  },
  cropBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  cropText: {
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
