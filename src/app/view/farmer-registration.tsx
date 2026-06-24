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

export default function FarmerRegistrationScreen() {
  const [gender, setGender] = useState("পুরুষ");

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#1F2937" />
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>নতুন কৃষক নিবন্ধন</Text>
          <Text style={styles.subtitle}>ধাপ ১ / ৫ — ব্যক্তিগত তথ্য</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stepper */}
        <View style={styles.stepperContainer}>
          <View style={styles.stepItem}>
            <View style={[styles.stepBar, styles.activeBar]} />
            <Text style={styles.activeStepText}>পরিচয়</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepBar} />
            <Text style={styles.stepText}>জমি</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepBar} />
            <Text style={styles.stepText}>আয়</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepBar} />
            <Text style={styles.stepText}>ঋণ</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepBar} />
            <Text style={styles.stepText}>ছবি</Text>
          </View>
        </View>

        {/* Form */}

        <Text style={styles.label}>পূর্ণ নাম (বাংলায়)</Text>
        <TextInput
          placeholder="যেমন: মোঃ আব্দুল করিম"
          style={styles.input}
        />

        <Text style={styles.label}>FULL NAME (ENGLISH)</Text>
        <TextInput
          placeholder="e.g. Md. Abdul Karim"
          style={styles.input}
        />

        <Text style={styles.label}>জাতীয় পরিচয়পত্র নম্বর (NID)</Text>

        <View style={styles.inputIcon}>
          <Ionicons name="document-text-outline" size={22} color="#7B8A8B" />
          <TextInput
            placeholder="১০ বা ১৭ সংখ্যা"
            style={styles.iconInput}
          />
        </View>

        <Text style={styles.label}>মোবাইল নম্বর</Text>

        <View style={styles.phoneContainer}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>+880</Text>
          </View>

          <TextInput
            placeholder="1XXXXXXXXX"
            keyboardType="phone-pad"
            style={styles.phoneInput}
          />
        </View>

        <Text style={styles.label}>জন্ম তারিখ</Text>

        <View style={styles.inputIcon}>
          <Ionicons name="calendar-outline" size={22} color="#7B8A8B" />
          <TextInput
            placeholder="mm/dd/yyyy"
            style={styles.iconInput}
          />
        </View>

        <Text style={styles.label}>লিঙ্গ</Text>

        <View style={styles.genderRow}>
          {["পুরুষ", "মহিলা", "অন্যান্য"].map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.genderBtn,
                gender === item && styles.genderBtnActive,
              ]}
              onPress={() => setGender(item)}
            >
              <Text
                style={[
                  styles.genderText,
                  gender === item && styles.genderTextActive,
                ]}
              >
                {gender === item ? "✓ " : ""}
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>পরবর্তী ধাপ</Text>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Navigation */}

      <View style={styles.bottomNav}>
        <NavItem icon="home-outline" text="Home" active />
        <NavItem icon="people-outline" text="Farmers" />
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
  },

  activeBar: {
    backgroundColor: "#157A5A",
  },

  activeStepText: {
    color: "#157A5A",
    fontWeight: "700",
    fontSize: 12,
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

  phoneContainer: {
    flexDirection: "row",
    marginHorizontal: 18,
  },

  countryCode: {
    width: 75,
    height: 60,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E4ECE9",
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
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E4ECE9",
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
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDE5E2",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },

  genderBtnActive: {
    borderColor: "#157A5A",
    borderWidth: 2,
    backgroundColor: "#ECFDF5",
  },

  genderText: {
    color: "#6B7280",
    fontWeight: "600",
  },

  genderTextActive: {
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