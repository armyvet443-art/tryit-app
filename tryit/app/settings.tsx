import { useRouter } from "expo-router";
import {
  ChevronRight,
  FileText,
  Info,
  KeyRound,
  LogOut,
  Shield,
  ShieldOff,
  Trash2,
  UserPen,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { deleteAccount } from "@/services/tryit-service";

interface RowProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

function SettingsRow({ icon, label, onPress, destructive = false }: RowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      {icon}
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
      <ChevronRight size={18} color={Colors.inactiveIcon} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { userId, profile, signOut } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState<boolean>(false);

  const handleChangePassword = async () => {
    if (!profile?.email) return;
    try {
      await supabase.auth.resetPasswordForEmail(profile.email);
      Alert.alert("Email sent 📬", "Check your inbox for a password reset link.");
    } catch {
      Alert.alert("Error", "Could not send the reset email. Try again later.");
    }
  };

  const handleSignOut = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.dismissAll();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    if (!userId) return;
    Alert.alert(
      "Delete account",
      "This permanently deletes your profile, posts, comments and messages. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await deleteAccount(userId);
              await signOut();
              router.dismissAll();
            } catch (e) {
              const message = e instanceof Error ? e.message : "Could not delete account.";
              Alert.alert("Error", message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>ACCOUNT</Text>
      <View style={styles.section}>
        <SettingsRow
          icon={<UserPen size={20} color={Colors.text} />}
          label="Edit Profile"
          onPress={() => router.push("/edit-profile")}
        />
        <SettingsRow
          icon={<KeyRound size={20} color={Colors.text} />}
          label="Change Password"
          onPress={handleChangePassword}
        />
      </View>

      <Text style={styles.sectionHeader}>SAFETY</Text>
      <View style={styles.section}>
        <SettingsRow
          icon={<ShieldOff size={20} color={Colors.text} />}
          label="Blocked Users"
          onPress={() => router.push("/settings/blocked")}
        />
      </View>

      <Text style={styles.sectionHeader}>ABOUT</Text>
      <View style={styles.section}>
        <SettingsRow
          icon={<Info size={20} color={Colors.text} />}
          label="About TryIt"
          onPress={() =>
            Alert.alert(
              "TryIt 🔥",
              "A social network for trying new things. Share your Tries, rate others with the Try Meter, and keep your streak alive.",
            )
          }
        />
        <SettingsRow
          icon={<Shield size={20} color={Colors.text} />}
          label="Privacy Policy"
          onPress={() =>
            Alert.alert(
              "Privacy Policy",
              "We only store the data needed to run TryIt: your profile, posts, reactions and messages. Your data is never sold to third parties.",
            )
          }
        />
        <SettingsRow
          icon={<FileText size={20} color={Colors.text} />}
          label="Terms of Service"
          onPress={() =>
            Alert.alert(
              "Terms of Service",
              "Be kind. Post only content you own. No harassment, spam, or unsafe challenges. Violations may result in account removal.",
            )
          }
        />
      </View>

      <Text style={styles.sectionHeader}>DANGER ZONE</Text>
      <View style={styles.section}>
        <SettingsRow
          icon={<LogOut size={20} color={Colors.warning} />}
          label="Log Out"
          onPress={handleSignOut}
        />
        <SettingsRow
          icon={<Trash2 size={20} color={Colors.error} />}
          label="Delete Account"
          onPress={handleDeleteAccount}
          destructive
        />
      </View>

      {busy ? (
        <View style={styles.busyOverlay}>
          <ActivityIndicator size="large" color={Colors.flameOrange} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    color: Colors.mutedText,
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 18,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowLabel: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    fontWeight: "500" as const,
  },
  rowLabelDestructive: {
    color: Colors.error,
  },
  busyOverlay: {
    paddingVertical: 24,
    alignItems: "center",
  },
});
