import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "../../../hooks/use-translation";
import { useColors } from "../../../features/officials/shared/constants/theme";

type PhotoType = "profile" | "nid" | "land";
type FormErrors = {
  profile?: string;
  nid?: string;
};

export default function PhotoScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [nidPhoto, setNidPhoto] = useState<string | null>(null);
  const [landPhoto, setLandPhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const pickImage = async (type: PhotoType) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t('galleryPermission'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      if (type === "profile") {
        setProfilePhoto(uri);
        setErrors((p) => ({ ...p, profile: undefined }));
      } else if (type === "nid") {
        setNidPhoto(uri);
        setErrors((p) => ({ ...p, nid: undefined }));
      } else {
        setLandPhoto(uri);
      }
    }
  };

  const takePhoto = async (type: PhotoType) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t('cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      if (type === "profile") {
        setProfilePhoto(uri);
        setErrors((p) => ({ ...p, profile: undefined }));
      } else if (type === "nid") {
        setNidPhoto(uri);
        setErrors((p) => ({ ...p, nid: undefined }));
      } else {
        setLandPhoto(uri);
      }
    }
  };

  const showPicker = (type: PhotoType) => {
    const labels: Record<PhotoType, string> = {
      profile: t('profilePhoto'),
      nid: t('nidPhoto'),
      land: t('landPhoto'),
    };
    const title = `${labels[type]} ${t('selectPhoto')}`;

    Alert.alert(title, "", [
      { text: t('gallery'), onPress: () => pickImage(type) },
      { text: t('camera'), onPress: () => takePhoto(type) },
      { text: t('cancel'), style: 'cancel' },
    ]);
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!profilePhoto) {
      newErrors.profile = t('profilePhotoRequired');
    }

    if (!nidPhoto) {
      newErrors.nid = t('nidPhotoRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      router.replace("/view/FarmerDashboard/farmer-dashboard");
    }
  };

  const renderPhotoBox = (
    type: PhotoType,
    label: string,
    subtitle: string,
    icon: keyof typeof Ionicons.glyphMap,
    photoUri: string | null,
    required?: boolean
  ) => (
    <View style={styles.photoSection}>
      <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>
        {label}
        {required && <Text style={[styles.requiredMark, { color: colors.dashboard.redDown }]}> *</Text>}
      </Text>
      <Text style={[styles.photoSubtitle, { color: colors.dashboard.textSecondary }]}>{subtitle}</Text>

      <TouchableOpacity
        style={[styles.photoBox, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}
        onPress={() => showPicker(type)}
      >
        {photoUri ? (
          <>
            <Image source={{ uri: photoUri }} style={styles.previewImage} />
            <View style={styles.photoOverlay}>
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.changeText}>{t('change')}</Text>
            </View>
          </>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name={icon} size={48} color={colors.dashboard.textSecondary} />
            <Text style={[styles.uploadText, { color: colors.dashboard.textSecondary }]}>{t('selectPhoto')}</Text>
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={[styles.photoActionBtn, { backgroundColor: colors.userVerified }]}
                onPress={() => pickImage(type)}
              >
                <Ionicons name="images-outline" size={18} color={colors.deepGreen} />
                <Text style={[styles.photoActionText, { color: colors.deepGreen }]}>{t('gallery')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoActionBtn, { backgroundColor: colors.userVerified }]}
                onPress={() => takePhoto(type)}
              >
                <Ionicons name="camera-outline" size={18} color={colors.deepGreen} />
                <Text style={[styles.photoActionText, { color: colors.deepGreen }]}>{t('camera')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
      {type !== "land" && errors[type] && (
        <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors[type]}</Text>
      )}
    </View>
  );

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
          <Text style={[styles.subtitle, { color: colors.dashboard.textSecondary }]}>{t('step5of5')}</Text>
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
            <View style={[styles.stepBar, styles.completedBar, { backgroundColor: colors.deepGreen }]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
            <Text style={[styles.completedStepText, { color: colors.deepGreen }]}>{t('loanStep')}</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepBar, styles.activeBar, { backgroundColor: colors.deepGreen }]} />
            <Text style={[styles.activeStepText, { color: colors.deepGreen }]}>{t('photoStep')}</Text>
          </View>
        </View>

        {renderPhotoBox(
          "profile",
          t('profilePhoto'),
          t('profilePhotoSub'),
          "person-circle-outline",
          profilePhoto,
          true
        )}

        {renderPhotoBox(
          "nid",
          t('nidPhoto'),
          t('nidPhotoSub'),
          "card-outline",
          nidPhoto,
          true
        )}

        {renderPhotoBox(
          "land",
          t('landPhoto'),
          t('landPhotoSub'),
          "leaf-outline",
          landPhoto
        )}

        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.deepGreen }]} onPress={handleSubmit}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.submitBtnText}>{t('submitRegistration')}</Text>
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
    marginTop: 18,
    fontWeight: "600",
  },
  requiredMark: {},
  photoSubtitle: {
    marginHorizontal: 18,
    fontSize: 13,
    marginBottom: 10,
  },
  photoBox: {
    marginHorizontal: 18,
    height: 200,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadText: {
    marginTop: 10,
    fontWeight: "500",
  },
  photoActions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 14,
  },
  photoActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  photoActionText: {
    fontWeight: "600",
    fontSize: 14,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  photoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  changeText: {
    color: "#fff",
    fontWeight: "600",
  },
  photoSection: {
    marginBottom: 4,
  },
  submitBtn: {
    marginHorizontal: 18,
    marginTop: 30,
    marginBottom: 25,
    height: 60,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
  },
  error: {
    fontSize: 13,
    marginHorizontal: 22,
    marginTop: 4,
    fontWeight: "500",
  },
});
