import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Bookmark, Share2 } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import CommentThread, { buildCommentTree } from "@/components/CommentThread";
import EmptyState from "@/components/EmptyState";
import FollowButton from "@/components/FollowButton";
import MediaCarousel from "@/components/MediaCarousel";
import Colors from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import {
  addComment,
  addReply,
  deleteComment,
  deleteReaction,
  fetchPost,
  getComments,
  getFollowingIds,
  getGuestReaction,
  getMyReactions,
  getSavedSet,
  getTriedSet,
  setSaved,
  setTried,
  upsertReaction,
} from "@/services/tryit-service";
import type { CommentItem, ReactionType, TryPost } from "@/types/models";
import { REACTION_META } from "@/types/models";
import { formatCount, parseMediaItems, timeAgo } from "@/utils/format";

const REACTION_ORDER: ReactionType[] = ["must_try", "worth_it", "maybe", "not_for_me"];

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = String(id ?? "");
  const { userId, guestId } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState<string>("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [sending, setSending] = useState<boolean>(false);
  const [reaction, setReaction] = useState<ReactionType | null>(null);
  const [counts, setCounts] = useState<Record<ReactionType, number>>({
    must_try: 0,
    worth_it: 0,
    maybe: 0,
    not_for_me: 0,
  });
  const [isTried, setIsTried] = useState<boolean>(false);
  const [triedCount, setTriedCount] = useState<number>(0);
  const [isSaved, setIsSaved] = useState<boolean>(false);

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

  // Real-time subscription for comments and reactions
  useEffect(() => {
    if (postId.length === 0) return;
    const channel = supabase
      .channel(`post-detail:${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
        () => queryClient.invalidateQueries({ queryKey: ["comments", postId] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions", filter: `post_id=eq.${postId}` },
        () => queryClient.invalidateQueries({ queryKey: ["post", postId] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, queryClient]);

  // Authenticated user's reaction (or guest reaction)
  const myReactionQuery = useQuery<ReactionType | null>({
    queryKey: ["myReaction", userId, postId],
    queryFn: async () => {
      if (userId) {
        const map = await getMyReactions([postId], userId);
        return map[postId] ?? null;
      }
      return getGuestReaction(postId, guestId);
    },
    enabled: postId.length > 0,
  });

  const triedQuery = useQuery<boolean>({
    queryKey: ["triedDetail", userId, postId],
    queryFn: async () => {
      if (!userId) return false;
      const set = await getTriedSet([postId], userId);
      return set.has(postId);
    },
    enabled: postId.length > 0,
  });

  const savedQuery = useQuery<boolean>({
    queryKey: ["savedDetail", userId, postId],
    queryFn: async () => {
      if (!userId) return false;
      const set = await getSavedSet([postId], userId);
      return set.has(postId);
    },
    enabled: postId.length > 0,
  });

  const followingQuery = useQuery<Set<string>>({
    queryKey: ["followingIds", userId],
    queryFn: () => getFollowingIds(userId as string),
    enabled: userId !== null,
  });

  useEffect(() => {
    setReaction(myReactionQuery.data ?? null);
  }, [myReactionQuery.data]);

  useEffect(() => {
    setIsTried(triedQuery.data ?? false);
  }, [triedQuery.data]);

  useEffect(() => {
    setIsSaved(savedQuery.data ?? false);
  }, [savedQuery.data]);

  useEffect(() => {
    if (postQuery.data) {
      setTriedCount(postQuery.data.tried_count);
      setCounts({
        must_try: postQuery.data.must_try_count,
        worth_it: postQuery.data.worth_it_count,
        maybe: postQuery.data.maybe_count,
        not_for_me: postQuery.data.not_for_me_count,
      });
    }
  }, [postQuery.data]);

  const post = postQuery.data;
  const mediaItems = useMemo(() => (post ? parseMediaItems(post) : []), [post]);
  const commentTree = useMemo(() => buildCommentTree(commentsQuery.data ?? []), [commentsQuery.data]);
  const totalVotes = REACTION_ORDER.reduce((sum, key) => sum + counts[key], 0);

  const handleReact = useCallback(
    async (type: ReactionType) => {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const previous = reaction;
      const nextCounts = { ...counts };
      if (previous === type) {
        setReaction(null);
        nextCounts[type] = Math.max(0, nextCounts[type] - 1);
        setCounts(nextCounts);
        try {
          await deleteReaction(postId, userId, guestId);
          queryClient.invalidateQueries({ queryKey: ["myReaction", userId, postId] });
          queryClient.invalidateQueries({ queryKey: ["post", postId] });
          queryClient.invalidateQueries({ queryKey: ["myReactions"] });
        } catch (e) {
          console.log("[reaction] delete failed", e);
          setReaction(previous);
          setCounts(counts);
        }
        return;
      }
      setReaction(type);
      if (previous) nextCounts[previous] = Math.max(0, nextCounts[previous] - 1);
      nextCounts[type] = nextCounts[type] + 1;
      setCounts(nextCounts);
      try {
        await upsertReaction(postId, type, userId, guestId);
        queryClient.invalidateQueries({ queryKey: ["myReaction", userId, postId] });
        queryClient.invalidateQueries({ queryKey: ["post", postId] });
        queryClient.invalidateQueries({ queryKey: ["myReactions"] });
      } catch (e) {
        console.log("[reaction] upsert failed", e);
        setReaction(previous);
        setCounts(counts);
      }
    },
    [reaction, counts, postId, userId, guestId, queryClient],
  );

  const handleTried = useCallback(async () => {
    if (!userId) {
      router.push("/auth/login");
      return;
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const next = !isTried;
    setIsTried(next);
    setTriedCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      await setTried(postId, userId, next);
      queryClient.invalidateQueries({ queryKey: ["triedDetail", userId, postId] });
      queryClient.invalidateQueries({ queryKey: ["triedPosts", userId] });
    } catch (e) {
      console.log("[tried] failed", e);
      setIsTried(!next);
      setTriedCount((c) => Math.max(0, c + (next ? -1 : 1)));
    }
  }, [isTried, postId, userId, router, queryClient]);

  const handleSave = useCallback(async () => {
    if (!userId) {
      router.push("/auth/login");
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !isSaved;
    setIsSaved(next);
    try {
      await setSaved(postId, userId, next);
      queryClient.invalidateQueries({ queryKey: ["savedDetail", userId, postId] });
    } catch (e) {
      console.log("[save] failed", e);
      setIsSaved(!next);
    }
  }, [isSaved, postId, userId, router, queryClient]);

  const handleSend = useCallback(async () => {
    if (!userId) {
      router.push("/auth/login");
      return;
    }
    const text = commentText.trim();
    if (text.length === 0) return;
    setSending(true);
    try {
      if (replyTo) {
        await addReply(postId, replyTo, userId, text);
      } else {
        await addComment(postId, userId, text);
      }
      setCommentText("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    } catch (e) {
      console.log("[comment] failed", e);
      const message = e instanceof Error ? e.message : "Could not post comment.";
      Alert.alert("Error", message);
    } finally {
      setSending(false);
    }
  }, [commentText, postId, userId, replyTo, router, queryClient]);

  const handleReply = useCallback((parentId: string) => {
    if (!userId) {
      router.push("/auth/login");
      return;
    }
    setReplyTo(parentId);
  }, [userId, router]);

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      if (!userId) return;
      Alert.alert("Delete comment?", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteComment(commentId, userId);
              queryClient.invalidateQueries({ queryKey: ["comments", postId] });
            } catch (e) {
              console.log("[comment] delete failed", e);
              Alert.alert("Error", "Could not delete comment.");
            }
          },
        },
      ]);
    },
    [userId, postId, queryClient],
  );

  const handleShare = useCallback(() => {
    Share.share({ message: `${post?.title ?? "Check this out!"} — see it on TryIt!` }).catch(() => {});
  }, [post?.title]);

  const openAuthor = useCallback(() => {
    if (post) router.push({ pathname: "/user/[id]", params: { id: post.user_id } });
  }, [router, post]);

  if (postQuery.isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.flameOrange} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.container}>
        <EmptyState emoji="🤷" title="Post not found" subtitle="It may have been removed." />
      </View>
    );
  }

  const replyTarget = replyTo ? (commentsQuery.data ?? []).find((c) => c.id === replyTo) : null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="post-back">
            <ArrowLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.authorRow} onPress={openAuthor}>
            <Avatar uri={post.author?.avatar_url} name={post.author?.display_name} size={36} />
            <View style={styles.authorInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName} numberOfLines={1}>
                  {post.author?.display_name ?? "Unknown"}
                </Text>
                {post.author?.is_verified ? <Text style={styles.verified}>✓</Text> : null}
              </View>
              <Text style={styles.metaText} numberOfLines={1}>
                @{post.author?.username ?? "user"} · {timeAgo(post.created_at)}
              </Text>
            </View>
          </TouchableOpacity>
          {post.author && post.user_id !== userId ? (
            <FollowButton targetUserId={post.user_id} isFollowing={followingQuery.data?.has(post.user_id) ?? false} compact />
          ) : null}
        </View>

        {/* Media carousel */}
        {mediaItems.length > 0 ? <MediaCarousel items={mediaItems} /> : null}

        {post.category ? (
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText}>{post.category}</Text>
          </View>
        ) : null}

        {/* Title & caption */}
        <Text style={styles.title}>{post.title}</Text>
        {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
        {post.location ? (
          <View style={styles.locationRow}>
            <Text style={styles.locationText}>📍 {post.location}</Text>
          </View>
        ) : null}

        {/* Try Meter */}
        <View style={styles.tryMeterHeader}>
          <Text style={styles.tryMeterLabel}>TRY METER</Text>
          <Text style={styles.votesText}>{formatCount(totalVotes)} votes</Text>
        </View>
        <View style={styles.reactionsRow}>
          {REACTION_ORDER.map((type) => {
            const meta = REACTION_META[type];
            const selected = reaction === type;
            const color = Colors[meta.colorKey];
            return (
              <TouchableOpacity
                key={type}
                testID={`reaction-${type}-${post.id}`}
                style={[
                  styles.reactionPill,
                  selected && { backgroundColor: `${color}26`, borderColor: color },
                ]}
                onPress={() => handleReact(type)}
              >
                <Text style={styles.reactionEmoji}>{meta.emoji}</Text>
                <Text style={[styles.reactionLabel, selected && { color }]} numberOfLines={1}>
                  {meta.label}
                </Text>
                <Text style={[styles.reactionCount, selected && { color }]}>
                  {formatCount(counts[type])}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Actions row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.triedButton, isTried && styles.triedButtonActive]}
            onPress={handleTried}
            testID={`tried-button-${post.id}`}
          >
            <Text style={styles.triedEmoji}>🔥</Text>
            <Text style={[styles.triedText, isTried && styles.triedTextActive]}>
              {isTried ? "Tried!" : "I Tried This"}
            </Text>
            <Text style={[styles.triedCount, isTried && styles.triedTextActive]}>
              {formatCount(triedCount)}
            </Text>
          </TouchableOpacity>
          <View style={styles.iconActions}>
            <TouchableOpacity style={styles.iconButton} onPress={handleSave} testID={`save-button-${post.id}`}>
              <Bookmark
                size={21}
                color={isSaved ? Colors.flameOrange : Colors.mutedText}
                fill={isSaved ? Colors.flameOrange : "transparent"}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleShare} testID={`share-button-${post.id}`}>
              <Share2 size={21} color={Colors.mutedText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsHeading}>
            Comments ({commentsQuery.data?.length ?? post.comment_count})
          </Text>
          {commentsQuery.isLoading ? (
            <ActivityIndicator size="small" color={Colors.flameOrange} style={{ marginTop: 20 }} />
          ) : commentTree.length === 0 ? (
            <EmptyState emoji="💬" title="No comments yet" subtitle="Start the conversation." />
          ) : (
            <CommentThread
              nodes={commentTree}
              currentUserId={userId}
              onReply={handleReply}
              onDelete={handleDeleteComment}
            />
          )}
        </View>
      </ScrollView>

      {/* Reply banner */}
      {replyTo && replyTarget ? (
        <View style={styles.replyBanner}>
          <Text style={styles.replyBannerText} numberOfLines={1}>
            Replying to {replyTarget.author?.display_name ?? "user"}
          </Text>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={styles.replyCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Comment input */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          testID="comment-input"
          style={styles.input}
          placeholder={userId ? (replyTo ? "Write a reply..." : "Add a comment...") : "Log in to comment"}
          placeholderTextColor={Colors.inactiveIcon}
          value={commentText}
          onChangeText={setCommentText}
          editable={userId !== null}
          onFocus={() => {
            if (!userId) router.push("/auth/login");
          }}
        />
        <TouchableOpacity
          testID="comment-send"
          style={[styles.sendButton, (sending || commentText.trim().length === 0) && styles.sendDisabled]}
          onPress={handleSend}
          disabled={sending || commentText.trim().length === 0}
        >
          {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.sendText}>Send</Text>}
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
  scroll: {
    flex: 1,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  authorInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  displayName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700" as const,
    flexShrink: 1,
  },
  verified: {
    color: Colors.neonBlue,
    fontSize: 12,
    fontWeight: "700" as const,
  },
  metaText: {
    color: Colors.mutedText,
    fontSize: 12,
    marginTop: 1,
  },
  categoryChip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,106,0,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,106,0,0.3)",
    marginHorizontal: 16,
    marginTop: 12,
  },
  categoryText: {
    color: Colors.flameOrange,
    fontSize: 11,
    fontWeight: "700" as const,
  },
  title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800" as const,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  caption: {
    color: "#CCCCCC",
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  locationRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  locationText: {
    color: Colors.mutedText,
    fontSize: 12,
  },
  tryMeterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 6,
  },
  tryMeterLabel: {
    color: Colors.mutedText,
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.2,
  },
  votesText: {
    color: Colors.mutedText,
    fontSize: 11,
  },
  reactionsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },
  reactionPill: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: "transparent",
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionLabel: {
    color: Colors.mutedText,
    fontSize: 10,
    fontWeight: "600" as const,
  },
  reactionCount: {
    color: Colors.mutedText,
    fontSize: 11,
    fontWeight: "700" as const,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  triedButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "transparent",
  },
  triedButtonActive: {
    backgroundColor: "rgba(255,106,0,0.15)",
    borderColor: Colors.flameOrange,
  },
  triedEmoji: {
    fontSize: 14,
  },
  triedText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  triedTextActive: {
    color: Colors.flameOrange,
  },
  triedCount: {
    color: Colors.mutedText,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  iconActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconButton: {
    padding: 4,
  },
  commentsSection: {
    marginTop: 20,
    paddingBottom: 12,
  },
  commentsHeading: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800" as const,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.softGray,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  replyBannerText: {
    color: Colors.mutedText,
    fontSize: 13,
    flex: 1,
  },
  replyCancel: {
    color: Colors.flameOrange,
    fontSize: 13,
    fontWeight: "700" as const,
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
    paddingHorizontal: 18,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800" as const,
  },
});
