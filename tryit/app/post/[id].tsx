import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Send } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import PostCard from "@/components/PostCard";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import {
  addComment,
  fetchPost,
  getComments,
  getFollowingIds,
  getMyReactions,
  getSavedSet,
  getTriedSet,
} from "@/services/tryit-service";
import type { CommentItem, ReactionType, TryPost } from "@/types/models";
import { timeAgo } from "@/utils/format";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = String(id ?? "");
  const { userId } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  const postQuery = useQuery<TryPost | null>({
    queryKey: ["post", postId],
    queryFn: () => fetchPost(postId),
    enabled: postId.length > 0,
  });

  const commentsQuery = useQuery<CommentItem[]>({
    queryKey: ["comments", postId],
    queryFn: () => getComments(postId),
    enabled: postId.length > 0,
  });

  const reactionsQuery = useQuery<Record<string, ReactionType>>({
    queryKey: ["myReactions", userId, postId],
    queryFn: () => getMyReactions([postId], userId as string),
    enabled: userId !== null && postId.length > 0,
  });

  const triedQuery = useQuery<Set<string>>({
    queryKey: ["triedSet", userId, postId],
    queryFn: () => getTriedSet([postId], userId as string),
    enabled: userId !== null && postId.length > 0,
  });

  const savedQuery = useQuery<Set<string>>({
    queryKey: ["savedSet", userId, postId],
    queryFn: () => getSavedSet([postId], userId as string),
    enabled: userId !== null && postId.length > 0,
  });

  const followingQuery = useQuery<Set<string>>({
    queryKey: ["followingIds", userId],
    queryFn: () => getFollowingIds(userId as string),
    enabled: userId !== null,
  });

  const handleSend = useCallback(async () => {
    if (!userId) {
      router.push("/auth/login");
      return;
    }
    const text = commentText.trim();
    if (text.length === 0) return;
    setSending(true);
    try {
      await addComment(postId, userId, text);
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    } catch (e) {
      console.log("[comment] failed", e);
    } finally {
      setSending(false);
    }
  }, [commentText, postId, userId, router, queryClient]);

  if (postQuery.isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.flameOrange} />
      </View>
    );
  }

  const post = postQuery.data;
  if (!post) {
    return (
      <View style={styles.container}>
        <EmptyState emoji="🤷" title="Post not found" subtitle="It may have been removed." />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <FlatList
        data={commentsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <View style={styles.postWrap}>
              <PostCard
                post={post}
                myReaction={reactionsQuery.data?.[postId] ?? null}
                tried={triedQuery.data?.has(postId) ?? false}
                saved={savedQuery.data?.has(postId) ?? false}
                isFollowingAuthor={followingQuery.data?.has(post.user_id) ?? false}
              />
            </View>
            <Text style={styles.commentsHeading}>
              Comments ({commentsQuery.data?.length ?? post.comment_count})
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.commentRow}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/user/[id]", params: { id: item.user_id } })}
            >
              <Avatar uri={item.author?.avatar_url} name={item.author?.display_name} size={34} />
            </TouchableOpacity>
            <View style={styles.commentBody}>
              <View style={styles.commentMeta}>
                <Text style={styles.commentAuthor}>{item.author?.display_name ?? "User"}</Text>
                <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
              </View>
              <Text style={styles.commentText}>{item.content}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          commentsQuery.isLoading ? null : (
            <EmptyState emoji="💬" title="No comments yet" subtitle="Start the conversation." />
          )
        }
        contentContainerStyle={{ paddingBottom: 12 }}
      />

      {/* Comment input */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          testID="comment-input"
          style={styles.input}
          placeholder={userId ? "Add a comment..." : "Log in to comment"}
          placeholderTextColor={Colors.inactiveIcon}
          value={commentText}
          onChangeText={setCommentText}
          editable={userId !== null}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          onPressIn={() => {
            if (!userId) router.push("/auth/login");
          }}
        />
        <TouchableOpacity
          testID="comment-send"
          style={[styles.sendButton, (sending || commentText.trim().length === 0) && styles.sendDisabled]}
          onPress={handleSend}
          disabled={sending || commentText.trim().length === 0}
        >
          {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Send size={18} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
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
  },
  postWrap: {
    paddingTop: 12,
  },
  commentsHeading: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800" as const,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  commentRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  commentBody: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  commentAuthor: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  commentTime: {
    color: Colors.mutedText,
    fontSize: 11,
  },
  commentText: {
    color: "#DDDDDD",
    fontSize: 14,
    lineHeight: 19,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.softGray,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: Colors.flameOrange,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.5,
  },
});
