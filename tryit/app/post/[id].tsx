import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Bookmark, Flag, MoreHorizontal, Pencil, Share2, ShieldOff, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
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
  blockUser,
  deleteComment,
  deletePost,
  fetchPost,
  getComments,
  getFollowingIds,
  getMyReactions,
  getReactionCounts,
  getSavedSet,
  getTriedSet,
  isFired as checkIsFired,
  reportPost,
  REPORT_REASONS,
  setSaved,
  setTried,
  toggleFire,
  upsertReaction,
} from "@/services/tryit-service";
import type { CommentItem, ReactionType, TryPost } from "@/types/models";
import { REACTION_META } from "@/types/models";
import { formatCount, parseMediaItems, timeAgo } from "@/utils/format";

type ReactionCounts = Record<ReactionType, number>;

const EMPTY_COUNTS: ReactionCounts = {
  must_try: 0,
  worth_it: 0,
  maybe: 0,
  not_for_me: 0,
};

const REACTION_ORDER: ReactionType[] = ["must_try", "worth_it", "maybe", "not_for_me"];

export default function PostDetailScreen() {
  const { id, focusComment } = useLocalSearchParams<{ id: string; focusComment?: string }>();
  const postId = String(id ?? "");
  const { userId } = useAuth();
  const shouldFocusComment = focusComment === "true";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState<string>("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [sending, setSending] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const inputRef = React.useRef<TextInput>(null);
  const [reaction, setReaction] = useState<ReactionType | null>(null);
  const [counts, setCounts] = useState<ReactionCounts>(EMPTY_COUNTS);
  const [isTried, setIsTried] = useState<boolean>(false);
  const [triedCount, setTriedCount] = useState<number>(0);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isFired, setIsFired] = useState<boolean>(false);
  const [fireCount, setFireCount] = useState<number>(0);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [reportVisible, setReportVisible] = useState<boolean>(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState<string>("");
  const [isReporting, setIsReporting] = useState<boolean>(false);
  const [isBlocking, setIsBlocking] = useState<boolean>(false);
  const fireScale = React.useRef(new Animated.Value(1)).current;
  const reactionScale = React.useRef(new Animated.Value(1)).current;

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

  // Reaction counts read straight from the reactions table — no RPC, no posts
  // counter columns. invalidated locally after each vote.
  const countsQuery = useQuery<ReactionCounts>({
    queryKey: ["reactionCounts", postId],
    queryFn: () => getReactionCounts(postId),
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
        (payload) => {
          console.log("[PostDetail] REALTIME reactions event", { postId, eventType: payload.eventType, new: payload.new, old: payload.old });
          queryClient.invalidateQueries({ queryKey: ["reactionCounts", postId] });
          queryClient.invalidateQueries({ queryKey: ["myReaction", userId, postId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, queryClient]);

  // Authenticated user's reaction (guests get null — voting requires auth)
  const myReactionQuery = useQuery<ReactionType | null>({
    queryKey: ["myReaction", userId, postId],
    queryFn: async () => {
      if (!userId) return null;
      const map = await getMyReactions([postId], userId);
      return map[postId] ?? null;
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

  const fireQuery = useQuery<{ fired: boolean; count: number }>({
    queryKey: ["fireDetail", userId, postId],
    queryFn: async () => {
      if (!userId) return { fired: false, count: 0 };
      const fired = await checkIsFired(postId, userId);
      const { count, error } = await supabase
        .from("post_likes")
        .select("id", { count: "exact", head: true })
        .eq("post_id", postId);
      if (error) return { fired, count: 0 };
      return { fired, count: count ?? 0 };
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
    if (fireQuery.data) {
      setIsFired(fireQuery.data.fired);
      setFireCount(fireQuery.data.count);
    }
  }, [fireQuery.data]);

  useEffect(() => {
    if (countsQuery.data) {
      console.log("[PostDetail] countsQuery.data updated (realtime/refetch)", { postId, counts: countsQuery.data, currentLocal: counts });
      setCounts(countsQuery.data);
    }
  }, [countsQuery.data]);

  useEffect(() => {
    if (postQuery.data) {
      setTriedCount(postQuery.data.tried_count);
    }
  }, [postQuery.data]);

  const post = postQuery.data;
  const mediaItems = useMemo(() => (post ? parseMediaItems(post) : []), [post]);
  const commentTree = useMemo(() => buildCommentTree(commentsQuery.data ?? []), [commentsQuery.data]);
  const totalVotes = REACTION_ORDER.reduce((sum, key) => sum + counts[key], 0);

  const handleReact = useCallback(
    async (type: ReactionType) => {
      if (!userId) {
        setShowLoginModal(true);
        return;
      }
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const previous = reaction;
      const nextReaction = previous === type ? null : type;
      const nextCounts = { ...counts };
      if (previous) nextCounts[previous] = Math.max(0, nextCounts[previous] - 1);
      if (nextReaction) nextCounts[nextReaction] = nextCounts[nextReaction] + 1;
      setReaction(nextReaction);
      setCounts(nextCounts);
      if (nextReaction) {
        reactionScale.setValue(0.8);
        Animated.spring(reactionScale, {
          toValue: 1,
          friction: 3,
          tension: 50,
          useNativeDriver: true,
        }).start();
      }
      try {
        console.log("[PostDetail.handleReact] calling upsertReaction", { postId, nextReaction, userId, isOwnPost: post?.user_id === userId });
        const freshCounts = await upsertReaction(postId, nextReaction, userId);
        console.log("[PostDetail.handleReact] upsertReaction returned", { postId, freshCounts });
        setCounts(freshCounts);
      } catch (e) {
        console.log("[PostDetail.handleReact] upsert FAILED", { postId, reaction: nextReaction, userId, error: e });
        setReaction(previous);
        setCounts(counts);
      }
    },
    [reaction, counts, postId, userId],
  );

  const handleFire = useCallback(async () => {
    if (!userId) {
      setShowLoginModal(true);
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(fireScale, { toValue: 1.3, duration: 80, useNativeDriver: true }),
      Animated.spring(fireScale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
    ]).start();
    const next = !isFired;
    setIsFired(next);
    setFireCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const freshCount = await toggleFire(postId, userId);
      setFireCount(freshCount);
      queryClient.invalidateQueries({ queryKey: ["fireCounts"] });
      queryClient.invalidateQueries({ queryKey: ["myFires"] });
    } catch (e) {
      console.log("[fire] toggle failed", e);
      setIsFired(!next);
      setFireCount((c) => Math.max(0, c + (next ? -1 : 1)));
    }
  }, [isFired, fireScale, postId, userId, queryClient]);

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
    // Require auth — guests cannot comment.
    if (!userId) {
      setShowLoginModal(true);
      return;
    }
    const text = commentText.trim();
    if (text.length === 0 || sending) return;
    setSending(true);
    try {
      if (replyTo) {
        await addReply(postId, replyTo, text, userId);
      } else {
        await addComment(postId, text, userId);
      }
      setCommentText("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    } catch (e) {
      console.log("[comment] failed", e);
      const message = e instanceof Error ? e.message : "Could not post comment.";
      Alert.alert("Error", message);
    } finally {
      setSending(false);
    }
  }, [commentText, postId, userId, replyTo, sending, queryClient]);

  const handleReply = useCallback((parentId: string) => {
    if (!userId) {
      setShowLoginModal(true);
      return;
    }
    setReplyTo(parentId);
    inputRef.current?.focus();
  }, [userId]);

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      if (!userId) return;
      Alert.alert("Delete comment?", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Optimistic: remove from local cache immediately
            queryClient.setQueriesData<CommentItem[]>(
              { queryKey: ["comments", postId] },
              (old) => (old ? old.filter((c) => c.id !== commentId) : old),
            );
            try {
              await deleteComment(commentId, userId);
              queryClient.invalidateQueries({ queryKey: ["comments", postId] });
              queryClient.invalidateQueries({ queryKey: ["post", postId] });
            } catch (e) {
              console.log("[comment] delete failed", e);
              Alert.alert("Error", "Could not delete comment.");
              // Revert optimistic on failure
              queryClient.invalidateQueries({ queryKey: ["comments", postId] });
            }
          },
        },
      ]);
    },
    [userId, postId, queryClient],
  );

  const [isSharePressed, setIsSharePressed] = useState(false);

  const handleShare = useCallback(async () => {
    if (!post) return;
    if (!userId) {
      setShowLoginModal(true);
      return;
    }
    const link = `https://tryit-rn-migration.rork.app/post/${post.id}`;
    try {
      if (Share.share) {
        const result = await Share.share({
          message: `Check this try on TryIt: ${link}`,
          url: link,
        });
        if (result.action === Share.sharedAction) return;
      }
    } catch {}
    try {
      if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        Alert.alert("Link copied!", `Share it: ${link}`);
      } else {
        Alert.alert("Share", link);
      }
    } catch {
      Alert.alert("Share", link);
    }
  }, [post]);

  // Focus the comment input when navigated with focusComment=true
  useEffect(() => {
    if (shouldFocusComment && post) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [shouldFocusComment, post]);

  const isOwner = userId !== null && post?.user_id === userId;

  const handleEdit = useCallback(() => {
    setMenuVisible(false);
    if (postId.length > 0) router.push({ pathname: "/edit/[id]", params: { id: postId } });
  }, [router, postId]);

  const handleDelete = useCallback(() => {
    setMenuVisible(false);
    Alert.alert(
      "Delete this post?",
      "This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (isDeleting || !post) return;
            setIsDeleting(true);
            try {
              await deletePost(postId, post.media_url);
              queryClient.invalidateQueries({ queryKey: ["feed"] });
              queryClient.invalidateQueries({ queryKey: ["userPosts"] });
              queryClient.removeQueries({ queryKey: ["post", postId] });
              Alert.alert("Post deleted", "Your post has been removed.");
              router.back();
            } catch (e) {
              console.log("[deletePost] failed", e);
              Alert.alert("Error", "Could not delete the post. Please try again.");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  }, [isDeleting, post, postId, queryClient, router]);

  const handleReport = useCallback(() => {
    setMenuVisible(false);
    setReportVisible(true);
  }, []);

  const handleSubmitReport = useCallback(async () => {
    if (!selectedReason || isReporting || !post) return;
    setIsReporting(true);
    try {
      await reportPost(
        postId,
        selectedReason,
        selectedReason === "Other" ? reportDetails.trim() || null : null,
        userId,
        "",
      );
      setReportVisible(false);
      setSelectedReason(null);
      setReportDetails("");
      Alert.alert("Reported", "Thanks for reporting — we reviewed and will take action if needed.");
    } catch (e) {
      console.log("[report] failed", e);
      Alert.alert("Error", "Could not submit report. Please try again.");
    } finally {
      setIsReporting(false);
    }
  }, [selectedReason, isReporting, post, postId, reportDetails, userId]);

  const handleBlock = useCallback(() => {
    setMenuVisible(false);
    if (!post || (userId && post.user_id === userId)) return; // Prevent self-block
    const username = post.author?.username ?? "user";
    Alert.alert(
      `Block @${username}?`,
      "You won't see their posts anymore. You can unblock in Settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            if (isBlocking) return;
            setIsBlocking(true);
            try {
              await blockUser(post.user_id, userId, "");
              queryClient.invalidateQueries({ queryKey: ["feed"] });
              queryClient.invalidateQueries({ queryKey: ["explore-trending"] });
              queryClient.invalidateQueries({ queryKey: ["explore-category"] });
              Alert.alert("Blocked", `@${username} has been blocked.`);
              router.back();
            } catch (e) {
              console.log("[block] failed", e);
              Alert.alert("Error", "Could not block this user. Please try again.");
            } finally {
              setIsBlocking(false);
            }
          },
        },
      ],
    );
  }, [post, userId, isBlocking, queryClient, router]);

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
    <>
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
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            testID={`post-detail-menu-${post.id}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreHorizontal size={22} color={Colors.mutedText} />
          </TouchableOpacity>
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
              <Animated.View style={{ transform: [{ scale: selected ? reactionScale : 1 }] }}>
                <Text style={styles.reactionEmoji}>{meta.emoji}</Text>
                <Text style={[styles.reactionLabel, selected && { color }]} numberOfLines={1}>
                  {meta.label}
                </Text>
                <Text style={[styles.reactionCount, selected && { color }]}>
                  {formatCount(counts[type])}
                </Text>
              </Animated.View>
            </TouchableOpacity>
            );
          })}
        </View>

        {/* Actions row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.fireButton}
            onPress={handleFire}
            testID={`fire-button-${post.id}`}
            activeOpacity={0.7}
          >
            <Animated.Text
              style={[
                styles.fireEmoji,
                { transform: [{ scale: fireScale }] },
                isFired && styles.fireEmojiActive,
              ]}
            >
              🔥
            </Animated.Text>
            <Text style={[styles.fireCount, isFired && styles.fireCountActive]}>
              {formatCount(fireCount)}
            </Text>
          </TouchableOpacity>
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
            <TouchableOpacity
              style={[styles.iconButton, { opacity: isSharePressed ? 0.7 : 1 }]}
              onPress={handleShare}
              onPressIn={() => setIsSharePressed(true)}
              onPressOut={() => setIsSharePressed(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID={`share-button-${post.id}`}
            >
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
          ref={inputRef}
          testID="comment-input"
          style={styles.input}
          placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
          placeholderTextColor={Colors.inactiveIcon}
          value={commentText}
          onChangeText={setCommentText}
          maxLength={280}
          onFocus={() => {
            if (!userId) {
              setShowLoginModal(true);
            }
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
      <Text style={[styles.charCounter, 280 - commentText.length <= 20 && styles.charCounterLow]}>
        {280 - commentText.length} characters left
      </Text>
      </KeyboardAvoidingView>

      {/* Login prompt for guests */}
      <Modal
        visible={showLoginModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLoginModal(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowLoginModal(false)}
        >
          <View style={styles.loginSheet}>
            <Text style={styles.loginTitle}>Please sign in to comment</Text>
            <Text style={styles.loginSubtitle}>Join TryIt to share your thoughts and interact with others.</Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => {
                setShowLoginModal(false);
                router.push("/auth/login");
              }}
            >
              <Text style={styles.loginButtonText}>Log In / Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => setShowLoginModal(false)}
            >
              <Text style={[styles.menuItemText, { color: Colors.mutedText }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Post menu modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuSheet}>
            {isOwner ? (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={handleEdit} testID={`edit-post-detail-${post.id}`}>
                  <Pencil size={20} color={Colors.text} />
                  <Text style={styles.menuItemText}>Edit Post</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={handleDelete} testID={`delete-post-detail-${post.id}`} disabled={isDeleting}>
                  <Trash2 size={20} color={Colors.error} />
                  <Text style={[styles.menuItemText, { color: Colors.error }]}>Delete Post</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={handleReport} testID={`report-post-detail-${post.id}`}>
                  <Flag size={20} color={Colors.mutedText} />
                  <Text style={styles.menuItemText}>Report Post</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={handleBlock} testID={`block-user-detail-${post.id}`} disabled={isBlocking}>
                  <ShieldOff size={20} color={Colors.error} />
                  <Text style={[styles.menuItemText, { color: Colors.error }]}>Block @{post.author?.username ?? "user"}</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => setMenuVisible(false)}>
              <Text style={[styles.menuItemText, { color: Colors.mutedText }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report modal */}
      <Modal
        visible={reportVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isReporting) setReportVisible(false);
        }}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => {
            if (!isReporting) setReportVisible(false);
          }}
        >
          <View style={styles.reportSheet}>
            <Text style={styles.reportTitle}>Report Post</Text>
            <Text style={styles.reportSubtitle}>Why are you reporting this?</Text>
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonRow,
                  selectedReason === reason && styles.reasonRowSelected,
                ]}
                onPress={() => setSelectedReason(reason)}
              >
                <Text
                  style={[
                    styles.reasonText,
                    selectedReason === reason && styles.reasonTextSelected,
                  ]}
                >
                  {reason}
                </Text>
                {selectedReason === reason ? (
                  <Text style={styles.reasonCheck}>✓</Text>
                ) : null}
              </TouchableOpacity>
            ))}
            {selectedReason === "Other" ? (
              <TextInput
                style={styles.reportInput}
                placeholder="Tell us more (optional)"
                placeholderTextColor={Colors.inactiveIcon}
                value={reportDetails}
                onChangeText={setReportDetails}
                maxLength={500}
                multiline
              />
            ) : null}
            <TouchableOpacity
              style={[
                styles.reportSubmitBtn,
                (!selectedReason || isReporting) && styles.reportSubmitDisabled,
              ]}
              onPress={handleSubmitReport}
              disabled={!selectedReason || isReporting}
            >
              {isReporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.reportSubmitText}>Submit Report</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => {
                if (!isReporting) {
                  setReportVisible(false);
                  setSelectedReason(null);
                  setReportDetails("");
                }
              }}
            >
              <Text style={[styles.menuItemText, { color: Colors.mutedText }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
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
  menuButton: {
    padding: 6,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    paddingBottom: 20,
  },
  menuSheet: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    minHeight: 52,
  },
  menuItemLast: {
    justifyContent: "center",
    borderBottomWidth: 0,
  },
  menuItemText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600" as const,
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
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  fireButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  fireEmoji: {
    fontSize: 16,
    opacity: 0.5,
  },
  fireEmojiActive: {
    opacity: 1,
  },
  fireCount: {
    color: Colors.mutedText,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  fireCountActive: {
    color: Colors.flameOrange,
  },
  triedButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
  charCounter: {
    color: Colors.mutedText,
    fontSize: 11,
    textAlign: "right",
    paddingRight: 16,
    paddingBottom: 6,
  },
  charCounterLow: {
    color: Colors.error,
  },
  loginSheet: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loginTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800" as const,
    textAlign: "center",
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  loginSubtitle: {
    color: Colors.mutedText,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    lineHeight: 20,
  },
  loginButton: {
    backgroundColor: Colors.flameOrange,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800" as const,
  },
  reportSheet: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reportTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800" as const,
    textAlign: "center",
    paddingTop: 22,
    paddingHorizontal: 20,
  },
  reportSubtitle: {
    color: Colors.mutedText,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    minHeight: 48,
  },
  reasonRowSelected: {
    backgroundColor: "rgba(255,106,0,0.1)",
  },
  reasonText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "500" as const,
  },
  reasonTextSelected: {
    color: Colors.flameOrange,
    fontWeight: "700" as const,
  },
  reasonCheck: {
    color: Colors.flameOrange,
    fontSize: 16,
    fontWeight: "800" as const,
  },
  reportInput: {
    backgroundColor: Colors.softGray,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
    minHeight: 60,
    maxHeight: 100,
  },
  reportSubmitBtn: {
    backgroundColor: Colors.flameOrange,
    marginHorizontal: 20,
    marginVertical: 10,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  reportSubmitDisabled: {
    opacity: 0.5,
  },
  reportSubmitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800" as const,
  },
});
