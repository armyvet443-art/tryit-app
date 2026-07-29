import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import { Camera, ImagePlus, Video as VideoIcon } from "lucide-react-native";
import React, { useCallback, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { createPost, uploadPostMedia, uploadPostVideo } from "@/services/tryit-service";
import { CATEGORIES } from "@/types/models";

export default function CreateScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageExt, setImageExt] = useState<string>("jpg");
  const [isVideo, setIsVideo] = useState<boolean>(false);
  const [posting, setPosting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [mediaLoadFailed, setMediaLoadFailed] = useState<boolean>(false);
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [customCategory, setCustomCategory] = useState<string>("");

  const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB hard cap (matches bucket limit)
  const SOFT_LIMIT_BYTES = 50 * 1024 * 1024; // warn above this

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      aspect: [4, 3],
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Low,
      videoExportPreset: ImagePicker.VideoExportPreset.LowQuality,
    });
    console.log("[pickImage] result:", { canceled: result.canceled, assets: result.assets?.map(a => ({ uri: a.uri, type: a.type, mimeType: a.mimeType })) });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const assetIsVideo =
        asset.type === "video" ||
        asset.mimeType?.startsWith("video/") === true ||
        /\.(mp4|mov|webm)$/i.test(asset.uri);
      console.log("[pickImage] asset picked:", { uri: asset.uri, isVideo: assetIsVideo, mimeType: asset.mimeType, type: asset.type });

      if (assetIsVideo) {
        // Enforce the bucket size limit BEFORE upload so we can give a clear
        // message instead of a generic "exceeded maximum size" from storage.
        try {
          const info = await FileSystem.getInfoAsync(asset.uri);
          const sizeBytes = info.exists && !info.isDirectory ? info.size : 0;
          console.log("[pickImage] video size bytes:", sizeBytes);
          if (sizeBytes > MAX_VIDEO_BYTES) {
            Alert.alert(
              "Video too large",
              `That video is ${(sizeBytes / 1024 / 1024).toFixed(1)}MB. The max is 100MB — pick a shorter clip or trim it down.`,
            );
            return;
          }
          if (sizeBytes > SOFT_LIMIT_BYTES && sizeBytes <= MAX_VIDEO_BYTES) {
            Alert.alert(
              "Large video",
              `This clip is ${(sizeBytes / 1024 / 1024).toFixed(1)}MB. It may upload slowly or fail if the storage bucket cap is lower. For best results, trim it shorter in your Photos app first.`,
              [{ text: "Use it anyway", style: "default" }, { text: "Pick another", style: "cancel" }],
            );
          }
        } catch (e) {
          console.log("[pickImage] could not read file size, continuing", e);
        }
      }

      setMediaLoadFailed(false);
      setIsVideo(assetIsVideo);
      setImageUri(asset.uri);
      if (assetIsVideo) {
        // Videos are uploaded via file URI (fetch→Blob), not base64
        setImageBase64(null);
        const ext = asset.uri.split(".").pop()?.toLowerCase() ?? "mp4";
        setImageExt(ext === "mov" ? "mov" : "mp4");
      } else {
        setImageBase64(asset.base64 ?? null);
        const ext = asset.uri.split(".").pop()?.toLowerCase() ?? "jpg";
        setImageExt(ext === "png" ? "png" : "jpg");
      }
    }
  };

  const handlePost = async () => {
    // Prevent double-tap
    if (posting) return;
    if (!userId) {
      router.push("/auth/login");
      return;
    }
    if (title.trim().length === 0) {
      Alert.alert("Missing title", "Give your Try a title.");
      return;
    }
    if (category.length === 0) {
      Alert.alert("Missing category", "Pick a category for your Try.");
      return;
    }
    setPosting(true);
    setUploadProgress(0);
    try {
      let mediaUrl = "";
      let mediaType: "image" | "video" = "image";
      if (isVideo && imageUri) {
        setUploadProgress(10);
        mediaUrl = await uploadPostVideo(imageUri, imageExt, userId);
        setUploadProgress(80);
        mediaType = "video";
      } else if (imageBase64) {
        setUploadProgress(10);
        mediaUrl = await uploadPostMedia(imageBase64, imageExt, userId);
        setUploadProgress(80);
        mediaType = "image";
      }
      setUploadProgress(90);
      console.log("[handlePost] creating post:", { mediaUrl, mediaType });
      await createPost({
        userId,
        title: title.trim(),
        caption: caption.trim(),
        mediaUrl,
        mediaType,
        category,
        location: location.trim(),
      });
      setUploadProgress(100);
      // Clear draft on success
      setTitle("");
      setCaption("");
      setCategory("");
      setLocation("");
      setImageBase64(null);
      setImageUri(null);
      setIsVideo(false);
      setShowCustomInput(false);
      setCustomCategory("");
      setUploadProgress(0);
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["userPosts", userId] });
      Alert.alert("Posted! 🔥", "Your Try is live.");
      router.push("/(tabs)");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      // Keep draft for retry — don't clear fields on fail
      setUploadProgress(0);
      Alert.alert("Upload failed", "Check your internet and try again. Your draft is saved.");
      console.log("[handlePost] error", message);
    } finally {
      setPosting(false);
    }
  };

  if (!userId) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Camera size={44} color={Colors.flameOrange} />
        <Text style={styles.authTitle}>Share what you tried</Text>
        <Text style={styles.authSubtitle}>Log in to post photos of your Tries and get the community voting.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/auth/login")}>
          <Text style={styles.primaryButtonText}>Log In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>New Try</Text>

        <TouchableOpacity style={styles.mediaPicker} onPress={pickImage} testID="pick-image-button">
          {imageUri ? (
            <View style={styles.mediaPreviewWrap}>
              <Image
                source={{ uri: imageUri }}
                style={styles.mediaPreview}
                contentFit="cover"
                onError={() => setMediaLoadFailed(true)}
                onLoad={() => setMediaLoadFailed(false)}
              />
              {mediaLoadFailed ? (
                <View style={styles.mediaErrorOverlay}>
                  <Text style={styles.mediaErrorText}>Couldn't load preview</Text>
                  <Text style={styles.mediaRetryText}>Tap to retry</Text>
                </View>
              ) : null}
              {isVideo ? (
                <View style={styles.videoBadge}>
                  <VideoIcon size={16} color="#FFFFFF" />
                  <Text style={styles.videoBadgeText}>VIDEO</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.mediaPlaceholder}>
              <ImagePlus size={36} color={Colors.mutedText} />
              <Text style={styles.mediaPlaceholderText}>Add a photo or video</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Upload progress bar */}
        {posting && uploadProgress > 0 ? (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>Uploading... {uploadProgress}%</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Title</Text>
        <TextInput
          testID="title-input"
          style={styles.input}
          placeholder="What did you try?"
          placeholderTextColor={Colors.inactiveIcon}
          value={title}
          onChangeText={setTitle}
          maxLength={120}
        />

        <Text style={styles.label}>Caption</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Tell the story — how did it go?"
          placeholderTextColor={Colors.inactiveIcon}
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={2000}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoriesWrap}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.categoryChip, category === c && styles.categoryChipActive]}
              onPress={() => {
                setCategory(c);
                setShowCustomInput(false);
                setCustomCategory("");
              }}
            >
              <Text style={[styles.categoryText, category === c && styles.categoryTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
          {/* Custom category pill — dashed border, orange text */}
          <TouchableOpacity
            style={[
              styles.categoryChip,
              showCustomInput && styles.customChipActive,
            ]}
            onPress={() => {
              setShowCustomInput(true);
              if (customCategory) {
                setCategory(customCategory);
              } else {
                setCategory("");
              }
            }}
          >
            <Text style={[styles.categoryText, styles.customChipText, showCustomInput && styles.categoryTextActive]}>
              + Custom
            </Text>
          </TouchableOpacity>
          {/* Show the selected custom category as an orange pill */}
          {showCustomInput && customCategory.length > 0 && category === customCategory && (
            <View style={[styles.categoryChip, styles.categoryChipActive]}>
              <Text style={[styles.categoryText, styles.categoryTextActive]}>{customCategory}</Text>
            </View>
          )}
        </View>
        {showCustomInput && (
          <TextInput
            style={[styles.input, styles.customInput]}
            placeholder="Type your category... (e.g. Birdwatching)"
            placeholderTextColor={Colors.inactiveIcon}
            value={customCategory}
            onChangeText={(text) => {
              const cleaned = text.trim().split("\s")[0];
              setCustomCategory(cleaned);
              if (cleaned.length > 0) {
                setCategory(cleaned);
              } else {
                setCategory("");
              }
            }}
            maxLength={20}
            autoCapitalize="words"
            autoCorrect={false}
          />
        )}

        <Text style={styles.label}>Location (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Where was it?"
          placeholderTextColor={Colors.inactiveIcon}
          value={location}
          onChangeText={setLocation}
          maxLength={120}
        />

        <TouchableOpacity
          testID="submit-post-button"
          style={[styles.primaryButton, posting && styles.buttonDisabled]}
          onPress={handlePost}
          disabled={posting}
        >
          {posting ? (
            <View style={styles.postingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.primaryButtonText}>
                {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : "Posting..."}
              </Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Post It 🔥</Text>
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
  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  authTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "800" as const,
  },
  authSubtitle: {
    color: Colors.mutedText,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  heading: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "800" as const,
    marginBottom: 14,
  },
  mediaPicker: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  mediaPreviewWrap: {
    width: "100%",
    height: 240,
  },
  mediaPreview: {
    width: "100%",
    height: 240,
    backgroundColor: Colors.surfaceVariant,
  },
  videoBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15,15,15,0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  videoBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 0.5,
  },
  mediaErrorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,15,15,0.7)",
  },
  mediaErrorText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: "700" as const,
  },
  mediaRetryText: {
    color: Colors.mutedText,
    fontSize: 12,
    marginTop: 4,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.flameOrange,
    borderRadius: 3,
  },
  progressText: {
    color: Colors.mutedText,
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
  postingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  mediaPlaceholder: {
    width: "100%",
    height: 180,
    backgroundColor: Colors.softGray,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed" as const,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mediaPlaceholderText: {
    color: Colors.mutedText,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  label: {
    color: Colors.mutedText,
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    marginBottom: 6,
    marginTop: 12,
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
  categoriesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: Colors.softGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: "rgba(255,106,0,0.15)",
    borderColor: Colors.flameOrange,
  },
  customChipActive: {
    borderStyle: "dashed" as const,
    borderColor: Colors.flameOrange,
    backgroundColor: "rgba(255,106,0,0.10)",
  },
  customChipText: {
    color: Colors.flameOrange,
  },
  customInput: {
    marginTop: 8,
  },
  categoryText: {
    color: Colors.mutedText,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  categoryTextActive: {
    color: Colors.flameOrange,
  },
  primaryButton: {
    backgroundColor: Colors.flameOrange,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 24,
    minWidth: 160,
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
