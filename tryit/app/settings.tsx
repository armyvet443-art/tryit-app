import { useRouter } from "expo-router";
import {
  Bell,
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
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { deleteAccount } from "@/services/tryit-service";
import {
  getPushPrefs,
  setPushPrefs,
  type NotificationType,
} from "@/services/push-service";

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

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

function ToggleRow({ label, description, value, onValueChange }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.border, true: Colors.flameOrange }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { userId, profile, signOut, sendPasswordReset } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState<boolean>(false);
  const [pushPrefs, setPushPrefsState] = useState<Record<NotificationType, boolean>>({
    reactions: true,
    comments: true,
    follows: true,
    tries: true,
    fires: true,
  });
  const [prefsLoaded, setPrefsLoaded] = useState<boolean>(false);

  useEffect(() => {
    getPushPrefs().then((prefs) => {
      setPushPrefsState(prefs);
      setPrefsLoaded(true);
    });
  }, []);

  const togglePref = useCallback(
    (type: NotificationType, value: boolean) => {
      const next = { ...pushPrefs, [type]: value };
      setPushPrefsState(next);
      setPushPrefs(next);
    },
    [pushPrefs],
  );

  const handleChangePassword = async () => {
    if (!profile?.email) return;
    try {
      await sendPasswordReset(profile.email);
      Alert.alert(
        "Email sent 📬",
        "Check your inbox for a password reset link. Tap the link to set a new password.",
      );
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

      <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
      <View style={styles.section}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleLabel}>Push Notifications</Text>
            <Text style={styles.toggleDesc}>Get notified on this device</Text>
          </View>
          <Bell size={20} color={Colors.flameOrange} />
        </View>
        {prefsLoaded ? (
          <>
            <View style={styles.divider} />
            <ToggleRow
              label="Fires"
              description="When someone fires your post"
              value={pushPrefs.fires}
              onValueChange={(v) => togglePref("fires", v)}
            />
            <ToggleRow
              label="Reactions"
              description="Must Try, Worth It, Maybe, Not for Me"
              value={pushPrefs.reactions}
              onValueChange={(v) => togglePref("reactions", v)}
            />
            <ToggleRow
              label="Comments"
              description="When someone comments on your post"
              value={pushPrefs.comments}
              onValueChange={(v) => togglePref("comments", v)}
            />
            <ToggleRow
              label="Follows"
              description="When someone follows you"
              value={pushPrefs.follows}
              onValueChange={(v) => togglePref("follows", v)}
            />
            <ToggleRow
              label="I Tried This"
              description="When someone tries your post"
              value={pushPrefs.tries}
              onValueChange={(v) => togglePref("tries", v)}
            />
          </>
        ) : null}
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
  },
  toggleText: {
    flex: 1,
    paddingRight: 12,
  },
  toggleLabel: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "500" as const,
  },
  toggleDesc: {
    color: Colors.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginHorizontal: 14,
  },
  busyOverlay: {
    paddingVertical: 24,
    alignItems: "center",
  },
});
