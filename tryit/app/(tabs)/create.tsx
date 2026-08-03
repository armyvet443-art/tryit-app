import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useEventListener } from "expo";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import { Camera, Crop, ImageIcon, ImagePlus, Play, Video as VideoIcon, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
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

/**
 * Video preview slot for the Create screen.
 * Shows a play button overlay on the first frame; tapping plays the
 * trimmed video inline so users can preview before posting.
 */
function VideoPreviewSlot({
  uri,
  playing,
  onPlay,
  onEnd,
  onRemove,
}: {
  uri: string;
  playing: boolean;
  onPlay: () => void;
  onEnd: () => void;
  onRemove: () => void;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
  });

  useEffect(() => {
    if (playing) {
      player.play();
    } else {
      player.pause();
    }
  }, [playing, player]);

  // Show the play button again when playback ends
  useEventListener(player, "playToEnd", () => {
    onEnd();
  });

  return (
    <View style={styles.mediaPreviewWrap}>
      <VideoView
        player={player}
        style={styles.mediaPreview}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />
      {!playing ? (
        <TouchableOpacity
          style={styles.playOverlayBtn}
          onPress={onPlay}
          activeOpacity={0.8}
          testID="preview-video-play"
        >
          <Play size={32} color="#FFFFFF" fill="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={styles.removeBtn} onPress={onRemove} testID="remove-video">
        <X size={16} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={[styles.slotBadge, styles.slotBadgeVideo]}>
        <VideoIcon size={12} color="#FFFFFF" />
        <Text style={styles.slotBadgeText}>VIDEO</Text>
      </View>
    </View>
  );
}

export default function CreateScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [location, setLocation] = useState<string>("");

  // Primary media (photo) — slot 1
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoExt, setPhotoExt] = useState<string>("jpg");
  const [photoLoadFailed, setPhotoLoadFailed] = useState<boolean>(false);

  // Secondary media (video) — slot 2
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoExt, setVideoExt] = useState<string>("mp4");

  const [videoPlaying, setVideoPlaying] = useState<boolean>(false);
  const [posting, setPosting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [customCategory, setCustomCategory] = useState<string>("");

  const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB hard cap (matches bucket limit)
  const SOFT_LIMIT_BYTES = 50 * 1024 * 1024; // warn above this

  const hasPhoto = photoUri !== null && photoBase64 !== null;
  const hasVideo = videoUri !== null;
  const hasAnyMedia = hasPhoto || hasVideo;
  const hasBoth = hasPhoto && hasVideo;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setPhotoLoadFailed(false);
      setPhotoUri(asset.uri);
      setPhotoBase64(asset.base64 ?? null);
      const ext = asset.uri.split(".").pop()?.toLowerCase() ?? "jpg";
      setPhotoExt(ext === "png" ? "png" : "jpg");
    }
  };

  const recropPhoto = async () => {
    if (!photoUri) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setPhotoLoadFailed(false);
      setPhotoUri(asset.uri);
      setPhotoBase64(asset.base64 ?? null);
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: true,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Low,
      videoExportPreset: ImagePicker.VideoExportPreset.LowQuality,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      try {
        const info = await FileSystem.getInfoAsync(asset.uri);
        const sizeBytes = info.exists && !info.isDirectory ? info.size : 0;
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
        console.log("[pickVideo] could not read file size, continuing", e);
      }
      setVideoUri(asset.uri);
      const ext = asset.uri.split(".").pop()?.toLowerCase() ?? "mp4";
      setVideoExt(ext === "mov" ? "mov" : "mp4");
    }
  };

  const removePhoto = () => {
    setPhotoBase64(null);
    setPhotoUri(null);
    setPhotoLoadFailed(false);
  };

  const removeVideo = () => {
    setVideoUri(null);
    setVideoPlaying(false);
  };

  const handlePost = async () => {
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
    if (!hasAnyMedia) {
      Alert.alert("Add media", "Pick at least one photo or video for your Try.");
      return;
    }
    setPosting(true);
    setUploadProgress(0);
    try {
      const uploadedItems: { url: string; type: "image" | "video"; thumbnail?: string }[] = [];
      let videoThumbnailUrl: string | undefined;

      if (hasPhoto && photoBase64) {
        setUploadProgress(10);
        const photoUrl = await uploadPostMedia(photoBase64, photoExt, userId);
        uploadedItems.push({ url: photoUrl, type: "image" });
      }

      if (hasVideo && videoUri) {
        setUploadProgress(uploadedItems.length > 0 ? 50 : 10);
        const { videoUrl, thumbnailUrl } = await uploadPostVideo(videoUri, videoExt, userId);
        uploadedItems.push({ url: videoUrl, type: "video", thumbnail: thumbnailUrl });
        videoThumbnailUrl = thumbnailUrl;
      }

      setUploadProgress(85);
      console.log("[handlePost] creating post with", uploadedItems.length, "media items");

      if (uploadedItems.length > 1) {
        await createPost({
          userId,
          title: title.trim(),
          caption: caption.trim(),
          mediaUrl: "",
          mediaType: uploadedItems[0].type,
          category,
          location: location.trim(),
          mediaItems: uploadedItems,
        });
      } else {
        await createPost({
          userId,
          title: title.trim(),
          caption: caption.trim(),
          mediaUrl: uploadedItems[0].url,
          mediaType: uploadedItems[0].type,
          thumbnailUrl: videoThumbnailUrl,
          category,
          location: location.trim(),
        });
      }

      setUploadProgress(100);
      // Clear draft on success
      setTitle("");
      setCaption("");
      setCategory("");
      setLocation("");
      setPhotoBase64(null);
      setPhotoUri(null);
      setVideoUri(null);
      setShowCustomInput(false);
      setCustomCategory("");
      setUploadProgress(0);
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["userPosts", userId] });
      Alert.alert("Posted! 🔥", "Your Try is live.");
      router.push("/(tabs)");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
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

        {/* Dual media picker — photo + video side by side */}
        <View style={styles.mediaRow}>
          {/* Photo slot */}
          <View style={styles.mediaSlot}>
            {photoUri ? (
              <View style={styles.mediaPreviewWrap}>
                <Image
                  source={{ uri: photoUri }}
                  style={styles.mediaPreview}
                  contentFit="cover"
                  onError={() => setPhotoLoadFailed(true)}
                  onLoad={() => setPhotoLoadFailed(false)}
                />
                {photoLoadFailed ? (
                  <View style={styles.mediaErrorOverlay}>
                    <Text style={styles.mediaErrorText}>Couldn't load</Text>
                  </View>
                ) : null}
                <TouchableOpacity style={styles.removeBtn} onPress={removePhoto} testID="remove-photo">
                  <X size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} onPress={recropPhoto} testID="recrop-photo">
                  <Crop size={14} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.slotBadge}>
                  <ImageIcon size={12} color="#FFFFFF" />
                  <Text style={styles.slotBadgeText}>PHOTO</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.mediaPlaceholder}
                onPress={pickPhoto}
                testID="pick-photo-button"
              >
                <ImageIcon size={28} color={Colors.mutedText} />
                <Text style={styles.mediaPlaceholderText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Video slot */}
          <View style={styles.mediaSlot}>
            {videoUri ? (
              <VideoPreviewSlot
                uri={videoUri}
                playing={videoPlaying}
                onPlay={() => setVideoPlaying(true)}
                onEnd={() => setVideoPlaying(false)}
                onRemove={removeVideo}
              />
            ) : (
              <TouchableOpacity
                style={styles.mediaPlaceholder}
                onPress={pickVideo}
                testID="pick-video-button"
              >
                <VideoIcon size={28} color={Colors.mutedText} />
                <Text style={styles.mediaPlaceholderText}>Add Video</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {hasBoth ? (
          <Text style={styles.collageHint}>Both will be shown side by side in your post</Text>
        ) : null}

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
              const cleaned = text.trim().split(/\s/)[0] ?? "";
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
  mediaRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  mediaSlot: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  mediaPreviewWrap: {
    width: "100%",
    height: 200,
    position: "relative",
  },
  mediaPreview: {
    width: "100%",
    height: 200,
    backgroundColor: Colors.surfaceVariant,
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(15,15,15,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  slotBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(15,15,15,0.8)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  slotBadgeVideo: {
    backgroundColor: "rgba(255,106,0,0.85)",
  },
  slotBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
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
    fontSize: 13,
    fontWeight: "700" as const,
  },
  editBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,106,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  playOverlayBtn: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,15,15,0.35)",
  },
  collageHint: {
    color: Colors.flameOrange,
    fontSize: 12,
    fontWeight: "600" as const,
    textAlign: "center",
    marginBottom: 12,
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
    height: 200,
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
    fontSize: 13,
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
