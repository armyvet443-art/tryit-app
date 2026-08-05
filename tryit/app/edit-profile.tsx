import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Camera, CameraOff, Globe, Instagram, Music2, Youtube } from "lucide-react-native";
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
import { checkUsernameAvailable, updateProfile, uploadAvatar, uploadCover } from "@/services/tryit-service";

export default function EditProfileScreen() {
  const { userId, profile, guestId, refreshProfile } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState<string>(profile?.display_name ?? "");
  const [username, setUsername] = useState<string>(profile?.username ?? "");
  const [bio, setBio] = useState<string>(profile?.bio ?? "");
  const [website, setWebsite] = useState<string>(profile?.website ?? "");
  const [instagramUrl, setInstagramUrl] = useState<string>(profile?.instagram_url ?? "");
  const [tiktokUrl, setTiktokUrl] = useState<string>(profile?.tiktok_url ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState<string>(profile?.youtube_url ?? "");
  const [avatarUri, setAvatarUri] = useState<string>(profile?.avatar_url ?? "");
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [avatarExt, setAvatarExt] = useState<string>("jpg");
  const [coverUri, setCoverUri] = useState<string>(profile?.cover_url ?? "");
  const [coverBase64, setCoverBase64] = useState<string | null>(null);
  const [coverExt, setCoverExt] = useState<string>("jpg");
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

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
      allowsEditing: true,
      aspect: [3, 1],
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setCoverUri(asset.uri);
      setCoverBase64(asset.base64 ?? null);
      const ext = asset.uri.split(".").pop()?.toLowerCase() ?? "jpg";
      setCoverExt(ext === "png" ? "png" : "jpg");
    }
  };

  const removeCover = () => {
    setCoverUri("");
    setCoverBase64(null);
  };

  const handleSave = async () => {
    if (!userId) return;
    if (displayName.trim().length === 0 || username.trim().length === 0) {
      Alert.alert("Missing info", "Display name and username are required.");
      return;
    }
    if (bio.length > 150) {
      Alert.alert("Bio too long", "Bio must be 150 characters or less.");
      return;
    }
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "");
    // Check username uniqueness if changed
    if (cleanUsername !== profile?.username) {
      const available = await checkUsernameAvailable(cleanUsername, userId);
      if (!available) {
        Alert.alert("Username taken", "That username is already in use. Try another one.");
        return;
      }
    }
    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url ?? "";
      if (avatarBase64) {
        avatarUrl = await uploadAvatar(avatarBase64, avatarExt, userId);
      }
      let coverUrl = profile?.cover_url ?? "";
      if (coverBase64) {
        coverUrl = await uploadCover(coverBase64, coverExt, userId);
      } else if (coverUri.length === 0) {
        coverUrl = "";
      }
      await updateProfile(userId, {
        display_name: displayName.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        avatar_url: avatarUrl,
        cover_url: coverUrl,
        website: website.trim(),
        instagram_url: instagramUrl.trim(),
        tiktok_url: tiktokUrl.trim(),
        youtube_url: youtubeUrl.trim(),
      });
      // Bust image caches by invalidating all profile-adjacent queries
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["userPosts", userId] });
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
        {/* Cover picker */}
        <TouchableOpacity style={styles.coverPicker} onPress={pickCover} testID="cover-picker">
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverPreview} contentFit="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Camera size={24} color={Colors.mutedText} />
              <Text style={styles.coverPlaceholderText}>Add Cover Photo</Text>
            </View>
          )}
          {coverUri ? (
            <TouchableOpacity style={styles.coverRemove} onPress={removeCover} testID="cover-remove">
              <CameraOff size={14} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>

        {/* Avatar picker */}
        <View style={styles.avatarRow}>
          <TouchableOpacity style={styles.avatarPicker} onPress={pickAvatar} testID="avatar-picker">
            <Avatar uri={avatarUri} name={displayName} size={96} />
            <View style={styles.cameraBadge}>
              <Camera size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={Colors.inactiveIcon}
          maxLength={50}
          testID="edit-display-name"
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
          testID="edit-username"
        />

        <Text style={styles.label}>Bio {bio.length > 0 ? `(${bio.length}/150)` : ""}</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell people what you like to try..."
          placeholderTextColor={Colors.inactiveIcon}
          multiline
          maxLength={150}
          testID="edit-bio"
        />

        {/* Social Links Section */}
        <Text style={styles.sectionHeader}>LINKS</Text>

        <Text style={styles.label}>Website</Text>
        <View style={styles.inputWithIcon}>
          <Globe size={18} color={Colors.mutedText} />
          <TextInput
            style={styles.inputIcon}
            value={website}
            onChangeText={setWebsite}
            placeholder="https://your-site.com"
            placeholderTextColor={Colors.inactiveIcon}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            testID="edit-website"
          />
        </View>

        <Text style={styles.label}>Instagram</Text>
        <View style={styles.inputWithIcon}>
          <Instagram size={18} color={Colors.mutedText} />
          <TextInput
            style={styles.inputIcon}
            value={instagramUrl}
            onChangeText={setInstagramUrl}
            placeholder="@username or https://instagram.com/username"
            placeholderTextColor={Colors.inactiveIcon}
            autoCapitalize="none"
            autoCorrect={false}
            testID="edit-instagram"
          />
        </View>

        <Text style={styles.label}>TikTok</Text>
        <View style={styles.inputWithIcon}>
          <Music2 size={18} color={Colors.mutedText} />
          <TextInput
            style={styles.inputIcon}
            value={tiktokUrl}
            onChangeText={setTiktokUrl}
            placeholder="@username or https://tiktok.com/@username"
            placeholderTextColor={Colors.inactiveIcon}
            autoCapitalize="none"
            autoCorrect={false}
            testID="edit-tiktok"
          />
        </View>

        <Text style={styles.label}>YouTube</Text>
        <View style={styles.inputWithIcon}>
          <Youtube size={18} color={Colors.mutedText} />
          <TextInput
            style={styles.inputIcon}
            value={youtubeUrl}
            onChangeText={setYoutubeUrl}
            placeholder="https://youtube.com/@channel"
            placeholderTextColor={Colors.inactiveIcon}
            autoCapitalize="none"
            autoCorrect={false}
            testID="edit-youtube"
          />
        </View>

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
    paddingBottom: 40,
  },
  coverPicker: {
    width: "100%",
    height: 140,
    backgroundColor: Colors.softGray,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  coverPreview: {
    width: "100%",
    height: "100%",
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  coverPlaceholderText: {
    color: Colors.mutedText,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  coverRemove: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,68,68,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRow: {
    alignItems: "center",
    marginTop: -40,
    marginBottom: 8,
  },
  avatarPicker: {
    position: "relative",
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
    paddingHorizontal: 20,
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
    marginHorizontal: 20,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: "top" as const,
  },
  sectionHeader: {
    color: Colors.mutedText,
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    marginTop: 28,
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.softGray,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 20,
  },
  inputIcon: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    padding: 0,
  },
  primaryButton: {
    backgroundColor: Colors.flameOrange,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 28,
    marginHorizontal: 20,
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
