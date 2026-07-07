import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Camera } from "lucide-react-native";
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

import Avatar from "@/components/Avatar";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { updateProfile, uploadAvatar } from "@/services/tryit-service";

export default function EditProfileScreen() {
  const { userId, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState<string>(profile?.display_name ?? "");
  const [username, setUsername] = useState<string>(profile?.username ?? "");
  const [bio, setBio] = useState<string>(profile?.bio ?? "");
  const [avatarUri, setAvatarUri] = useState<string>(profile?.avatar_url ?? "");
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [avatarExt, setAvatarExt] = useState<string>("jpg");
  const [saving, setSaving] = useState<boolean>(false);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setAvatarUri(asset.uri);
      setAvatarBase64(asset.base64 ?? null);
      const ext = asset.uri.split(".").pop()?.toLowerCase() ?? "jpg";
      setAvatarExt(ext === "png" ? "png" : "jpg");
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    if (displayName.trim().length === 0 || username.trim().length === 0) {
      Alert.alert("Missing info", "Display name and username are required.");
      return;
    }
    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url ?? "";
      if (avatarBase64) {
        avatarUrl = await uploadAvatar(avatarBase64, avatarExt, userId);
      }
      await updateProfile(userId, {
        display_name: displayName.trim(),
        username: username.trim().toLowerCase().replace(/\s+/g, ""),
        bio: bio.trim(),
        avatar_url: avatarUrl,
      });
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      router.back();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not save profile.";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.avatarPicker} onPress={pickAvatar} testID="avatar-picker">
          <Avatar uri={avatarUri} name={displayName} size={96} />
          <View style={styles.cameraBadge}>
            <Camera size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={Colors.inactiveIcon}
          maxLength={50}
        />

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="username"
          placeholderTextColor={Colors.inactiveIcon}
          autoCapitalize="none"
          maxLength={30}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell people what you like to try..."
          placeholderTextColor={Colors.inactiveIcon}
          multiline
          maxLength={300}
        />

        <TouchableOpacity
          testID="save-profile-button"
          style={[styles.primaryButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Save</Text>}
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
    padding: 20,
    paddingBottom: 40,
  },
  avatarPicker: {
    alignSelf: "center",
    marginBottom: 8,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Colors.flameOrange,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.background,
  },
  label: {
    color: Colors.mutedText,
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.softGray,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: "top" as const,
  },
  primaryButton: {
    backgroundColor: Colors.flameOrange,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 28,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800" as const,
  },
});
