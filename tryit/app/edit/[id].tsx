import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { fetchPost, updatePost } from "@/services/tryit-service";
import { CATEGORIES } from "@/types/models";

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = String(id ?? "");
  const { userId } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const postQuery = useQuery({
    queryKey: ["post", postId],
    queryFn: () => fetchPost(postId),
    enabled: postId.length > 0,
  });

  const post = postQuery.data;

  const [caption, setCaption] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [originalCaption, setOriginalCaption] = useState<string>("");
  const [originalCategory, setOriginalCategory] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [customCategory, setCustomCategory] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);

  // Pre-fill fields once the post loads
  useEffect(() => {
    if (post && !initialized) {
      setCaption(post.caption);
      setCategory(post.category);
      setOriginalCaption(post.caption);
      setOriginalCategory(post.category);
      // If the post's category isn't in the standard list, it's a custom one
      if (post.category && !CATEGORIES.includes(post.category)) {
        setShowCustomInput(true);
        setCustomCategory(post.category);
      }
      setInitialized(true);
    }
  }, [post, initialized]);

  const isCustomCategory = useMemo(
    () => category.length > 0 && !CATEGORIES.includes(category),
    [category],
  );

  const hasChanges = useMemo(
    () => caption !== originalCaption || category !== originalCategory,
    [caption, category, originalCaption, originalCategory],
  );

  // Owner check — only the post author can edit
  const isOwner = userId !== null && post?.user_id === userId;

  const handleSave = useCallback(async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    try {
      await updatePost(postId, { caption: caption.trim(), category });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["userPosts"] });
      queryClient.invalidateQueries({ queryKey: ["explore-categories"] });
      Alert.alert("Updated", "Your post has been updated.");
      router.back();
    } catch (e) {
      console.log("[editPost] save failed", e);
      Alert.alert("Failed to save", "Could not update the post. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [hasChanges, saving, caption, category, postId, queryClient, router]);

  if (postQuery.isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.flameOrange} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Post not found.</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isOwner) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>You can only edit your own posts.</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Go back</Text>
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="edit-back">
            <ArrowLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.heading}>Edit Post</Text>
          <View style={styles.backBtnPlaceholder} />
        </View>

        {/* Title (read-only) */}
        <Text style={styles.label}>Title</Text>
        <View style={[styles.input, styles.readOnlyInput]}>
          <Text style={styles.readOnlyText}>{post.title}</Text>
        </View>

        {/* Caption (editable) */}
        <Text style={styles.label}>Caption</Text>
        <TextInput
          testID="edit-caption-input"
          style={[styles.input, styles.multiline]}
          placeholder="Tell the story — how did it go?"
          placeholderTextColor={Colors.inactiveIcon}
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={2000}
        />

        {/* Category picker */}
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoriesWrap}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.categoryChip,
                category === c && !showCustomInput && styles.categoryChipActive,
              ]}
              onPress={() => {
                setCategory(c);
                setShowCustomInput(false);
                setCustomCategory("");
              }}
            >
              <Text
                style={[
                  styles.categoryText,
                  category === c && !showCustomInput && styles.categoryTextActive,
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
          {/* Custom category pill — dashed border, orange text */}
          <TouchableOpacity
            style={[styles.categoryChip, showCustomInput && styles.customChipActive]}
            onPress={() => {
              setShowCustomInput(true);
              if (customCategory) {
                setCategory(customCategory);
              }
            }}
          >
            <Text
              style={[
                styles.categoryText,
                styles.customChipText,
                showCustomInput && styles.categoryTextActive,
              ]}
            >
              + Custom
            </Text>
          </TouchableOpacity>
          {/* Show the selected custom category as an orange pill */}
          {showCustomInput && customCategory.length > 0 && (
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
              }
            }}
            maxLength={20}
            autoCapitalize="words"
            autoCorrect={false}
          />
        )}

        {/* Save button */}
        <TouchableOpacity
          testID="save-changes-button"
          style={[styles.primaryButton, (!hasChanges || saving) && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Save Changes</Text>
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
  errorText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "700" as const,
    textAlign: "center",
  },
  backLink: {
    padding: 8,
  },
  backLinkText: {
    color: Colors.flameOrange,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  backBtn: {
    padding: 4,
  },
  backBtnPlaceholder: {
    width: 30,
  },
  heading: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "800" as const,
  },
  label: {
    color: Colors.mutedText,
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    marginBottom: 6,
    marginTop: 14,
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
  readOnlyInput: {
    opacity: 0.6,
  },
  readOnlyText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "600" as const,
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
    marginTop: 28,
    minWidth: 160,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800" as const,
  },
});
