import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "../../../hooks/use-translation";

type FormErrors = {
  totalLand?: string;
  ownLand?: string;
  crops?: string;
  location?: string;
};

export default function LandScreen() {
  const { t } = useTranslation();
  const [totalLand, setTotalLand] = useState("");
  const [ownLand, setOwnLand] = useState("");
  const [leasedLand, setLeasedLand] = useState("");
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const crops = ["ধান", "পাট", "গম", "আলু", "পেঁয়াজ", "সবজি", "চা", "আম"];

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
          <Text style={styles.subtitle}>{t('step2of5')}</Text>
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
            <View style={[styles.stepBar, styles.activeBar]} />
            <Text style={styles.activeStepText}>{t('land')}</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepBar} />
            <Text style={styles.stepText}>{t('incomeStep')}</Text>
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

        <Text style={styles.label}>{t('totalLandLabel2')}</Text>
        <View style={styles.inputIcon}>
          <Ionicons name="map-outline" size={22} color="#7B8A8B" />
          <TextInput
            placeholder={t('totalLandPlaceholder2')}
            keyboardType="decimal-pad"
            style={styles.iconInput}
            value={totalLand}
            onChangeText={(t) => { setTotalLand(t); setErrors((p) => ({ ...p, totalLand: undefined })); }}
          />
        </View>
        {errors.totalLand && <Text style={styles.error}>{errors.totalLand}</Text>}

        <Text style={styles.label}>{t('ownLandLabel2')}</Text>
        <View style={styles.inputIcon}>
          <Ionicons name="home-outline" size={22} color="#7B8A8B" />
          <TextInput
            placeholder={t('ownLandPlaceholder2')}
            keyboardType="decimal-pad"
            style={styles.iconInput}
            value={ownLand}
            onChangeText={(t) => { setOwnLand(t); setErrors((p) => ({ ...p, ownLand: undefined })); }}
          />
        </View>
        {errors.ownLand && <Text style={styles.error}>{errors.ownLand}</Text>}

        <Text style={styles.label}>{t('leasedLandLabel2')}</Text>
        <View style={styles.inputIcon}>
          <Ionicons name="document-outline" size={22} color="#7B8A8B" />
          <TextInput
            placeholder={t('leasedLandPlaceholder2')}
            keyboardType="decimal-pad"
            style={styles.iconInput}
            value={leasedLand}
            onChangeText={setLeasedLand}
          />
        </View>

        <Text style={styles.label}>{t('selectCrops')}</Text>
        <View style={styles.cropContainer}>
          {crops.map((crop) => (
            <TouchableOpacity
              key={crop}
              style={[
                styles.cropBtn,
                selectedCrops.includes(crop) && styles.cropBtnActive,
              ]}
              onPress={() => toggleCrop(crop)}
            >
              <Text
                style={[
                  styles.cropText,
                  selectedCrops.includes(crop) && styles.cropTextActive,
                ]}
              >
                {selectedCrops.includes(crop) ? "✓ " : ""}
                {crop}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.crops && <Text style={styles.error}>{errors.crops}</Text>}

        <Text style={styles.label}>{t('locationLabel2')}</Text>
        <View style={styles.inputIcon}>
          <Ionicons name="location-outline" size={22} color="#7B8A8B" />
          <TextInput
            placeholder={t('locationPlaceholder2')}
            style={styles.iconInput}
            value={location}
            onChangeText={(t) => { setLocation(t); setErrors((p) => ({ ...p, location: undefined })); }}
          />
        </View>
        {errors.location && <Text style={styles.error}>{errors.location}</Text>}

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
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDE5E2",
  },
  cropBtnActive: {
    borderColor: "#157A5A",
    borderWidth: 2,
    backgroundColor: "#ECFDF5",
  },
  cropText: {
    color: "#6B7280",
    fontWeight: "600",
  },
  cropTextActive: {
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
