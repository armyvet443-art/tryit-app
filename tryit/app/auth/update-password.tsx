import { useRouter, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import React, { useCallback, useEffect, useState } from "react";
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
import { CheckCircle2, KeyRound, Lock } from "lucide-react-native";

/**
 * On web, get the full URL including hash fragment.
 * expo-linking's getInitialURL may not include the hash on web.
 */
function getWebUrl(): string | null {
  if (Platform.OS !== "web") return null;
  try {
    return window.location.href;
  } catch {
    return null;
  }
}

import Colors from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

/**
 * Extract access_token and refresh_token from a Supabase recovery redirect URL.
 * Supabase may put them in the query string or the hash fragment, so we check both.
 */
function extractTokens(url: string): { accessToken: string; refreshToken: string } | null {
  try {
    let query = "";

    // Hash fragment: #access_token=...&refresh_token=...
    const hashIndex = url.indexOf("#");
    if (hashIndex !== -1) {
      query = url.substring(hashIndex + 1);
    }

    // Query string: ?access_token=...&refresh_token=...
    if (!query) {
      const queryIndex = url.indexOf("?");
      if (queryIndex !== -1) {
        query = url.substring(queryIndex + 1);
      }
    }

    if (!query) return null;

    const params = new URLSearchParams(query);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    // Only handle recovery flows
    if (type && type !== "recovery") return null;
    if (!accessToken || !refreshToken) return null;

    return { accessToken, refreshToken };
  } catch {
    return null;
  }
}

export default function UpdatePasswordScreen() {
  const { updatePassword } = useAuth();
  const router = useRouter();
  const searchParams = useLocalSearchParams();

  const [verifying, setVerifying] = useState<boolean>(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);

  /** Parse the deep-link URL, extract tokens, and establish a recovery session. */
  const handleUrl = useCallback(async (url: string | null) => {
    // On web with detectSessionInUrl:true, Supabase may have already
    // established a session from the URL hash. Check that first.
    const checkSession = async (retries = 3): Promise<boolean> => {
      for (let i = 0; i < retries; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) return true;
        // Wait 200ms before retrying — Supabase's detectSessionInUrl is async
        if (i < retries - 1) await new Promise((r) => setTimeout(r, 200));
      }
      return false;
    };

    if (!url) {
      // No URL — maybe user already has a valid session
      const hasSession = await checkSession();
      if (hasSession) {
        setVerifying(false);
        return;
      }
      setVerifyError("This link has expired or is invalid. Please request a new reset link.");
      setVerifying(false);
      return;
    }

    const tokens = extractTokens(url);
    if (!tokens) {
      // Maybe session was already established by Supabase (web flow)
      const hasSession = await checkSession();
      if (hasSession) {
        setVerifying(false);
        return;
      }
      setVerifyError("Could not verify your reset link. Please request a new one.");
      setVerifying(false);
      return;
    }

    try {
      const { error } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
      if (error) throw error;
      setVerifying(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not verify reset link.";
      setVerifyError(message);
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    // On web, the browser URL may contain the hash fragment with tokens.
    // On native, expo-linking gives us the deep-link URL.
    const webUrl = getWebUrl();

    // Build the full URL from search params (expo-router gives us the parsed params)
    const urlFromParams = Object.keys(searchParams).length > 0
      ? `${Linking.createURL("/auth/update-password")}?${new URLSearchParams(
          Object.entries(searchParams).map(([k, v]) => [k, String(v)]),
        ).toString()}`
      : null;

    // On web, prefer the browser URL (includes hash fragment with tokens).
    // On native, use getInitialURL (deep-link).
    if (webUrl) {
      handleUrl(webUrl);
    } else {
      Linking.getInitialURL().then((initialUrl) => {
        handleUrl(initialUrl ?? urlFromParams);
      });
    }

    // Listen for URL events (app already open — native only)
    const sub = Platform.OS !== "web"
      ? Linking.addEventListener("url", ({ url }) => {
          handleUrl(url);
        })
      : { remove: () => {} };

    return () => sub.remove();
  }, [handleUrl, searchParams]);

  const handleSubmit = async () => {
    if (password.length < 6) {
      Alert.alert("Too short", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not update password.";
      Alert.alert("Error", message);
    } finally {
      setBusy(false);
    }
  };

  // --- Verifying / loading state ---
  if (verifying) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.flameOrange} />
        <Text style={styles.loadingText}>Verifying your reset link…</Text>
      </View>
    );
  }

  // --- Error state ---
  if (verifyError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Link expired</Text>
        <Text style={styles.errorMessage}>{verifyError}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace("/auth/forgot-password")}
        >
          <Text style={styles.primaryButtonText}>Request New Link</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace("/auth/login")}>
          <Text style={styles.linkAccent}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Success state ---
  if (done) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.successIconWrap}>
          <CheckCircle2 size={48} color={Colors.success} />
        </View>
        <Text style={styles.successTitle}>Password updated! 🎉</Text>
        <Text style={styles.successText}>
          Your password has been changed successfully. You can now log in with your new password.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={async () => {
            await supabase.auth.signOut();
            router.replace("/auth/login");
          }}
        >
          <Text style={styles.primaryButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Password entry form ---
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
          <Lock size={32} color={Colors.flameOrange} />
        </View>
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>
          Enter a new password for your TryIt account.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="New password (6+ characters)"
          placeholderTextColor={Colors.inactiveIcon}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor={Colors.inactiveIcon}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        <TouchableOpacity
          testID="update-password-submit"
          style={[styles.primaryButton, busy && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Update Password</Text>
          )}
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
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 14,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 14,
  },
  iconWrap: {
    alignItems: "center",
    marginBottom: 4,
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
    minWidth: 200,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800" as const,
  },
  loadingText: {
    color: Colors.mutedText,
    fontSize: 14,
    marginTop: 8,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "800" as const,
  },
  errorMessage: {
    color: Colors.mutedText,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  successIconWrap: {
    marginBottom: 4,
  },
  successTitle: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "800" as const,
    textAlign: "center",
  },
  successText: {
    color: Colors.mutedText,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  linkAccent: {
    color: Colors.neonBlue,
    fontSize: 14,
    fontWeight: "700" as const,
  },
});
