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
import { Eye, EyeOff } from "lucide-react-native";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";

export default function SignupScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleSignup = async () => {
    if (!displayName.trim() || !username.trim() || !email.trim() || password.length < 6) {
      Alert.alert("Missing info", "Fill in all fields. Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      await signUp(email, password, username.toLowerCase().replace(/\s+/g, ""), displayName);
      Alert.alert(
        "Almost there! 📬",
        "Check your email to confirm your account, then log in.",
        [{ text: "OK", onPress: () => router.replace("/auth/login") }],
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Signup failed.";
      Alert.alert("Signup failed", message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>
          Join Try<Text style={styles.logoAccent}>It</Text> 🔥
        </Text>
        <Text style={styles.subtitle}>Share what you try. Inspire others to try it too.</Text>

        <TextInput
          style={styles.input}
          placeholder="Display name"
          placeholderTextColor={Colors.inactiveIcon}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={50}
        />
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={Colors.inactiveIcon}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          maxLength={30}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.inactiveIcon}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password (6+ characters)"
            placeholderTextColor={Colors.inactiveIcon}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((s) => !s)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {showPassword ? (
              <EyeOff size={20} color={Colors.mutedText} />
            ) : (
              <Eye size={20} color={Colors.mutedText} />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          testID="signup-submit"
          style={[styles.primaryButton, busy && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={busy}
        >
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/auth/login")}>
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkAccent}>Log in</Text>
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
    fontSize: 30,
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
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.softGray,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: Colors.text,
    fontSize: 15,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  linkText: {
    color: Colors.mutedText,
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
  },
  linkAccent: {
    color: Colors.neonBlue,
    fontWeight: "700" as const,
  },
});
