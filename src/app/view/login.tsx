import React from "react";
import { useState } from 'react';
import { z } from 'zod';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Pressable,
} from "react-native";
import { Link } from "expo-router";

const loginSchema = z.object({
  phone: z
    .string()
    .min(1, "মোবাইল নম্বর দিন / Enter phone number")
    .regex(/^01\d{9}$/, "বৈধ মোবাইল নম্বর দিন / Enter a valid 11-digit phone number"),
  password: z
    .string()
    .min(1, "পাসওয়ার্ড দিন / Enter password")
    .min(6, "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর / Password must be at least 6 characters"),
});

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = () => {
    const result = loginSchema.safeParse({ phone, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    console.log("Login data:", result.data);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Text style={styles.logo}>🌿</Text>
        </View>

        <Text style={styles.title}>SOFOL</Text>

        <Text style={styles.subtitle}>
          কৃষক ক্রেডিট প্রোফাইল প্ল্যাটফর্ম
        </Text>

        <Text style={styles.subText}>
          Farmer Credit Profile Platform - Bangladesh
        </Text>

        <View style={styles.statsRow}>
          <View>
            <Text style={styles.statValue}>৫০+</Text>
            <Text style={styles.statLabel}>Farmers</Text>
          </View>

          <View>
            <Text style={styles.statValue}>৭২%</Text>
            <Text style={styles.statLabel}>Approval Rate</Text>
          </View>

          <View>
            <Text style={styles.statValue}>৮৪.২ কোটি</Text>
            <Text style={styles.statLabel}>Disbursed</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.loginTitle}>লগইন করুন / Sign In</Text>

        <Text style={styles.label}>মোবাইল নম্বর / Phone Number</Text>

        <TextInput
          style={[styles.input, errors.phone && styles.inputError]}
          placeholder="01711-234567"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        {errors.phone && (
          <Text style={styles.errorText}>{errors.phone}</Text>
        )}

        <Text style={styles.label}>পাসওয়ার্ড / Password</Text>

        <TextInput
          style={[styles.input, errors.password && styles.inputError]}
          placeholder="********"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {errors.password && (
          <Text style={styles.errorText}>{errors.password}</Text>
        )}

        <TouchableOpacity>
          <Text style={styles.forgot}>
            পাসওয়ার্ড ভুলে গেছেন? / Forgot Password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginBtn} onPress={onSubmit}>
          <Text style={styles.loginBtnText}>লগইন / Login</Text>
        </TouchableOpacity>

        <Link href="/view/farmer-registration" asChild>
          <Pressable style={styles.signupBtn}>
            <Text style={styles.signupText}>নিবন্ধন করুন / Sign Up</Text>
          </Pressable>
        </Link>

        <Link href="/" asChild>
          <Pressable style={styles.getStartedBtn}>
            <Text style={styles.getStartedText}>Back to home</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#006847",
  },
  getStartedBtn:{
    backgroundColor: "#fff",
    height: 58,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    marginBottom: 16,
  },
  getStartedText:{

    color: "#006847",
    fontSize: 18,
    fontWeight: "700",  
  },
  signupBtn: {
    backgroundColor: "transparent",
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#006847",
    marginTop: 12,
    marginBottom: 12,
  },
  signupText: {
    color: "#006847",
    fontSize: 16,
    fontWeight: "600",
  },

  header: {
    height: 380,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  logoBox: {
    width: 90,
    height: 90,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  logo: {
    fontSize: 40,
  },

  title: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#fff",
  },

  subtitle: {
    color: "#fff",
    marginTop: 8,
    fontSize: 15,
  },

  subText: {
    color: "#cfe8dd",
    marginTop: 4,
    fontSize: 13,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 35,
    paddingHorizontal: 10,
  },

  statValue: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    textAlign: "center",
  },

  statLabel: {
    color: "#d6efe5",
    fontSize: 12,
    textAlign: "center",
  },

  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    marginTop: -20,
  },

  loginTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },

  label: {
    marginBottom: 8,
    color: "#555",
  },

  input: {
    height: 55,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 4,
  },
  inputError: {
    borderColor: "#e74c3c",
  },
  errorText: {
    color: "#e74c3c",
    fontSize: 12,
    marginBottom: 12,
  },

  forgot: {
    color: "#006847",
    textAlign: "right",
    marginBottom: 20,
    fontWeight: "600",
  },

  loginBtn: {
    backgroundColor: "#006847",
    height: 58,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },

  loginBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});