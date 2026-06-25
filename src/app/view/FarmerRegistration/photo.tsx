import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

type PhotoType = "profile" | "nid" | "land";
type FormErrors = {
  profile?: string;
  nid?: string;
};

export default function PhotoScreen() {
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [nidPhoto, setNidPhoto] = useState<string | null>(null);
  const [landPhoto, setLandPhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const pickImage = async (type: PhotoType) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("গ্যালারি অ্যাক্সেসের অনুমতি প্রয়োজন");
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
      alert("ক্যামেরা অ্যাক্সেসের অনুমতি প্রয়োজন");
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
      profile: "প্রোফাইল ছবি",
      nid: "জাতীয় পরিচয়পত্র",
      land: "জমির ছবি",
    };
    const title = `${labels[type]} নির্বাচন করুন`;

    alert(title); // simple fallback
    // In a real app, use ActionSheet. For now, use ImagePicker directly:
    pickImage(type);
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!profilePhoto) {
      newErrors.profile = "প্রোফাইল ছবি তুলুন বা আপলোড করুন";
    }

    if (!nidPhoto) {
      newErrors.nid = "জাতীয় পরিচয়পত্রের ছবি আপলোড করুন";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      router.replace("/view/FarmerRegistration/farmer-registration");
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
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.requiredMark}> *</Text>}
      </Text>
      <Text style={styles.photoSubtitle}>{subtitle}</Text>

      <TouchableOpacity
        style={styles.photoBox}
        onPress={() => showPicker(type)}
      >
        {photoUri ? (
          <>
            <Image source={{ uri: photoUri }} style={styles.previewImage} />
            <View style={styles.photoOverlay}>
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.changeText}>পরিবর্তন</Text>
            </View>
          </>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name={icon} size={48} color="#A0B4B7" />
            <Text style={styles.uploadText}>ছবি নির্বাচন করুন</Text>
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={() => pickImage(type)}
              >
                <Ionicons name="images-outline" size={18} color="#157A5A" />
                <Text style={styles.photoActionText}>গ্যালারি</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={() => takePhoto(type)}
              >
                <Ionicons name="camera-outline" size={18} color="#157A5A" />
                <Text style={styles.photoActionText}>ক্যামেরা</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
      {type !== "land" && errors[type] && (
        <Text style={styles.error}>{errors[type]}</Text>
      )}
    </View>
  );

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
          <Text style={styles.title}>নতুন কৃষক নিবন্ধন</Text>
          <Text style={styles.subtitle}>ধাপ ৫ / ৫ — ছবি আপলোড</Text>
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
            <View style={[styles.stepBar, styles.completedBar]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
            <Text style={styles.completedStepText}>ঋণ</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepBar, styles.activeBar]} />
            <Text style={styles.activeStepText}>ছবি</Text>
          </View>
        </View>

        {renderPhotoBox(
          "profile",
          "প্রোফাইল ছবি",
          "একটি স্পষ্ট সামনের দিকের ছবি আপলোড করুন",
          "person-circle-outline",
          profilePhoto,
          true
        )}

        {renderPhotoBox(
          "nid",
          "জাতীয় পরিচয়পত্র (NID)",
          "NID কার্ডের সামনের ও পিছনের ছবি একসাথে আপলোড করুন",
          "card-outline",
          nidPhoto,
          true
        )}

        {renderPhotoBox(
          "land",
          "জমির ছবি (ঐচ্ছিক)",
          "আপনার কৃষি জমির একটি ছবি আপলোড করুন",
          "leaf-outline",
          landPhoto
        )}

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.submitBtnText}>নিবন্ধন সম্পন্ন করুন</Text>
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
    marginTop: 18,
    fontWeight: "600",
    color: "#425466",
  },
  requiredMark: {
    color: "#DC2626",
  },
  photoSubtitle: {
    marginHorizontal: 18,
    color: "#7B8A8B",
    fontSize: 13,
    marginBottom: 10,
  },
  photoBox: {
    marginHorizontal: 18,
    height: 200,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E4ECE9",
    borderStyle: "dashed",
    overflow: "hidden",
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadText: {
    color: "#7B8A8B",
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
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  photoActionText: {
    color: "#157A5A",
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
    backgroundColor: "#157A5A",
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
