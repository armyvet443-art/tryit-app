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

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";

export default function LoginScreen() {
  const { signIn, signInWithMagicLink } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [magicBusy, setMagicBusy] = useState<boolean>(false);
  const [showMagicLink, setShowMagicLink] = useState<boolean>(false);

  const handleLogin = async () => {
    if (email.trim().length === 0 || password.length === 0) {
      Alert.alert("Missing info", "Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
      router.dismissAll();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Login failed.";
      Alert.alert("Login failed", message);
    } finally {
      setBusy(false);
    }
  };

  const handleMagicLink = async () => {
    if (email.trim().length === 0) {
      Alert.alert("Missing email", "Enter your email to receive a magic link.");
      return;
    }
    setMagicBusy(true);
    try {
      await signInWithMagicLink(email);
      Alert.alert(
        "Check your email 📬",
        "We sent a magic link to your email. Tap it to sign in.",
        [{ text: "OK", onPress: () => router.dismissAll() }],
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not send magic link.";
      Alert.alert("Error", message);
    } finally {
      setMagicBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>
          Try<Text style={styles.logoAccent}>It</Text> 🔥
        </Text>
        <Text style={styles.subtitle}>Welcome back. Keep trying new things.</Text>

        <TextInput
          testID="login-email"
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.inactiveIcon}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        {!showMagicLink ? (
          <TextInput
            testID="login-password"
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.inactiveIcon}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        ) : null}

        {!showMagicLink ? (
          <TouchableOpacity
            testID="login-submit"
            style={[styles.primaryButton, busy && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={busy}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Log In</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            testID="login-magic-link"
            style={[styles.primaryButton, magicBusy && styles.buttonDisabled]}
            onPress={handleMagicLink}
            disabled={magicBusy}
          >
            {magicBusy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Send Magic Link</Text>}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => setShowMagicLink((s) => !s)}
          testID="toggle-magic-link"
        >
          <Text style={styles.magicLinkText}>
            {showMagicLink ? "Use password instead" : "Sign in with magic link"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/auth/signup")} testID="login-to-signup">
          <Text style={styles.linkText}>
            New to TryIt? <Text style={styles.linkAccent}>Create an account</Text>
          </Text>
        </TouchableOpacity>
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
  logo: {
    color: Colors.text,
    fontSize: 36,
    fontWeight: "800" as const,
    textAlign: "center",
  },
  logoAccent: {
    color: Colors.flameOrange,
  },
  subtitle: {
    color: Colors.mutedText,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
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
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800" as const,
  },
  magicLinkText: {
    color: Colors.neonBlue,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600" as const,
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
});
