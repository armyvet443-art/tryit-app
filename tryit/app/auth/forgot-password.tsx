import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Mail } from "lucide-react-native";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";

export default function ForgotPasswordScreen() {
  const { sendPasswordReset } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [sent, setSent] = useState<boolean>(false);

  const handleSendReset = async () => {
    if (email.trim().length === 0) {
      Alert.alert("Missing email", "Enter the email associated with your account.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not send reset email.";
      Alert.alert("Error", message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconWrap}>
          <Mail size={36} color={Colors.flameOrange} />
        </View>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a link to reset your password.
        </Text>

        {sent ? (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Check your email 📬</Text>
            <Text style={styles.successText}>
              We sent a password reset link to{"\n"}
              <Text style={styles.emailHighlight}>{email.trim()}</Text>
              {"\n\n"}Open the email and tap the link to set a new password.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.dismissAll()}
            >
              <Text style={styles.primaryButtonText}>Back to Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSent(false);
                setEmail("");
              }}
            >
              <Text style={styles.resendText}>Didn't get it? Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.inactiveIcon}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <TouchableOpacity
              testID="forgot-submit"
              style={[styles.primaryButton, busy && styles.buttonDisabled]}
              onPress={handleSendReset}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.linkText}>
                <Text style={styles.linkAccent}>Back to Login</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 14,
  },
  iconWrap: {
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: "800" as const,
    textAlign: "center",
  },
  subtitle: {
    color: Colors.mutedText,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    backgroundColor: Colors.softGray,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: Colors.text,
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: Colors.flameOrange,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800" as const,
  },
  linkText: {
    color: Colors.mutedText,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  linkAccent: {
    color: Colors.neonBlue,
    fontWeight: "700" as const,
  },
  successBox: {
    alignItems: "center",
    gap: 14,
  },
  successTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "800" as const,
    textAlign: "center",
  },
  successText: {
    color: Colors.mutedText,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  emailHighlight: {
    color: Colors.flameOrange,
    fontWeight: "700" as const,
  },
  resendText: {
    color: Colors.neonBlue,
    fontSize: 13,
    fontWeight: "600" as const,
    textAlign: "center",
  },
});
