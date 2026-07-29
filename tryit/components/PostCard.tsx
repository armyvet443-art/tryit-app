import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Bookmark, Flag, MapPin, MessageCircle, MoreHorizontal, Play, Share2, ShieldOff, Trash2, Pencil } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import {
  blockUser,
  deletePost,
  reportPost,
  REPORT_REASONS,
  setSaved,
  setTried,
  toggleFire,
  upsertReaction,
} from "@/services/tryit-service";
import { REACTION_META, ReactionType, TryPost } from "@/types/models";
import { formatCount, timeAgo } from "@/utils/format";

type ReactionCounts = Record<ReactionType, number>;

const EMPTY_COUNTS: ReactionCounts = {
  must_try: 0,
  worth_it: 0,
  maybe: 0,
  not_for_me: 0,
};

const REACTION_ORDER: ReactionType[] = ["must_try", "worth_it", "maybe", "not_for_me"];

interface PostCardProps {
  post: TryPost;
  myReaction: ReactionType | null;
  reactionCounts?: ReactionCounts | null;
  tried: boolean;
  saved: boolean;
  isFollowingAuthor: boolean;
  showFollow?: boolean;
  fired?: boolean;
  fireCount?: number;
  onDeleted?: (postId: string) => void;
  onBlocked?: (blockedUserId: string) => void;
}

export default function PostCard({
  post,
  myReaction,
  reactionCounts,
  tried,
  saved,
  isFollowingAuthor,
  showFollow = true,
  fired = false,
  fireCount = 0,
  onDeleted,
  onBlocked,
}: PostCardProps) {
  const { userId, guestId } = useAuth();
  const router = useRouter();

  // Owner check — either logged-in user_id matches, or guest_id matches (for anonymous posts)
  const isOwner = userId !== null ? post.user_id === userId : false;

  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [reportVisible, setReportVisible] = useState<boolean>(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState<string>("");
  const [isReporting, setIsReporting] = useState<boolean>(false);
  const [isBlocking, setIsBlocking] = useState<boolean>(false);

  const [reaction, setReaction] = useState<ReactionType | null>(myReaction);
  const [counts, setCounts] = useState<ReactionCounts>(
    reactionCounts ?? {
      must_try: post.must_try_count,
      worth_it: post.worth_it_count,
      maybe: post.maybe_count,
      not_for_me: post.not_for_me_count,
    },
  );
  const [isTried, setIsTried] = useState<boolean>(tried);
  const [triedCount, setTriedCount] = useState<number>(post.tried_count);
  const [isSaved, setIsSaved] = useState<boolean>(saved);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [isFired, setIsFired] = useState<boolean>(fired);
  const [fireCountState, setFireCountState] = useState<number>(fireCount);
  const fireScale = React.useRef(new Animated.Value(1)).current;

  useEffect(() => setReaction(myReaction), [myReaction]);
  useEffect(() => setIsTried(tried), [tried]);
  useEffect(() => setIsSaved(saved), [saved]);
  useEffect(() => setIsFired(fired), [fired]);
  useEffect(() => setFireCountState(fireCount), [fireCount]);
  // Sync counts from the shared feed batch when they change and we're not
  // mid-interaction (reaction === myReaction means no local pending change).
  useEffect(() => {
    if (reactionCounts) setCounts(reactionCounts);
  }, [reactionCounts]);

  const totalVotes = REACTION_ORDER.reduce((sum, key) => sum + counts[key], 0);

  const handleReact = useCallback(
    async (type: ReactionType) => {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const previous = reaction;
      // Optimistic update: toggle off if same, otherwise switch.
      const nextReaction = previous === type ? null : type;
      const nextCounts = { ...counts };
      if (previous) nextCounts[previous] = Math.max(0, nextCounts[previous] - 1);
      if (nextReaction) nextCounts[nextReaction] = nextCounts[nextReaction] + 1;
      setReaction(nextReaction);
      setCounts(nextCounts);
      try {
        const freshCounts = await upsertReaction(post.id, nextReaction, userId, guestId);
        setCounts(freshCounts);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log("[reaction] upsert failed", { postId: post.id, reaction: nextReaction, userId, guestId, error: msg });
        setReaction(previous);
        setCounts(counts);
      }
    },
    [reaction, counts, post.id, userId, guestId],
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
      await setTried(post.id, userId, next);
    } catch (e) {
      console.log("[tried] failed", e);
      setIsTried(!next);
      setTriedCount((c) => Math.max(0, c + (next ? -1 : 1)));
    }
  }, [isTried, post.id, userId, router]);

  const handleSave = useCallback(async () => {
    if (!userId) {
      router.push("/auth/login");
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !isSaved;
    setIsSaved(next);
    try {
      await setSaved(post.id, userId, next);
    } catch (e) {
      console.log("[save] failed", e);
      setIsSaved(!next);
    }
  }, [isSaved, post.id, userId, router]);

  const handleFire = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(fireScale, { toValue: 1.3, duration: 80, useNativeDriver: true }),
      Animated.spring(fireScale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
    ]).start();
    const next = !isFired;
    setIsFired(next);
    setFireCountState((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const freshCount = await toggleFire(post.id, userId, guestId);
      setFireCountState(freshCount);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log("[fire] toggle failed", { postId: post.id, userId, guestId, error: msg });
      setIsFired(!next);
      setFireCountState((c) => Math.max(0, c + (next ? -1 : 1)));
    }
  }, [isFired, fireScale, post.id, userId, guestId]);

  const handleShare = useCallback(() => {
    Share.share({ message: `${post.title} — see it on TryIt!` }).catch(() => {});
  }, [post.title]);

  const handleEdit = useCallback(() => {
    setMenuVisible(false);
    router.push({ pathname: "/edit/[id]", params: { id: post.id } });
  }, [router, post.id]);

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
            if (isDeleting) return;
            setIsDeleting(true);
            // Optimistic: notify parent immediately
            if (onDeleted) onDeleted(post.id);
            try {
              await deletePost(post.id, post.media_url);
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
  }, [isDeleting, onDeleted, post.id, post.media_url]);

  const handleReport = useCallback(() => {
    setMenuVisible(false);
    setReportVisible(true);
  }, []);

  const handleSelectReason = useCallback((reason: string) => {
    setSelectedReason(reason);
  }, []);

  const handleSubmitReport = useCallback(async () => {
    if (!selectedReason || isReporting) return;
    setIsReporting(true);
    try {
      await reportPost(
        post.id,
        selectedReason,
        selectedReason === "Other" ? reportDetails.trim() || null : null,
        userId,
        guestId,
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
  }, [selectedReason, isReporting, post.id, reportDetails, userId, guestId]);

  const handleBlock = useCallback(() => {
    setMenuVisible(false);
    if (!post.user_id || (userId && post.user_id === userId)) return; // Prevent self-block
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
              await blockUser(post.user_id, userId, guestId);
              if (onBlocked) onBlocked(post.user_id);
              Alert.alert("Blocked", `@${username} has been blocked.`);
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
  }, [post.user_id, post.author?.username, userId, guestId, isBlocking, onBlocked]);

  const openAuthor = useCallback(() => {
    router.push({ pathname: "/user/[id]", params: { id: post.user_id } });
  }, [router, post.user_id]);

  const openDetail = useCallback(() => {
    router.push({ pathname: "/post/[id]", params: { id: post.id } });
  }, [router, post.id]);

  const openDetailWithComments = useCallback(() => {
    router.push({ pathname: "/post/[id]", params: { id: post.id, focusComment: "true" } });
  }, [router, post.id]);

  return (
    <View style={styles.card} testID={`post-card-${post.id}`}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.authorRow} onPress={openAuthor}>
          <Avatar uri={post.author?.avatar_url} name={post.author?.display_name} size={40} />
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
        <View style={styles.headerRight}>
          {showFollow && post.author && !isOwner ? (
            <FollowButton targetUserId={post.user_id} isFollowing={isFollowingAuthor} compact />
          ) : null}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            testID={`post-menu-${post.id}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreHorizontal size={22} color={Colors.mutedText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Media */}
      {post.media_url ? (
        <TouchableOpacity activeOpacity={0.9} onPress={openDetail}>
          <Image
            source={{ uri: post.thumbnail_url ?? post.media_url }}
            style={styles.media}
            contentFit="cover"
            transition={200}
          />
          {post.media_type === "video" ? (
            <View style={styles.playOverlay} testID={`video-play-${post.id}`}>
              <View style={styles.playCircle}>
                <Play size={26} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </View>
          ) : null}
          {post.category ? (
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{post.category}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ) : null}

      {/* Title & caption */}
      <TouchableOpacity onPress={openDetail} activeOpacity={0.8}>
        <Text style={styles.title}>{post.title}</Text>
      </TouchableOpacity>
      {post.caption ? (
        <TouchableOpacity onPress={() => setExpanded((e) => !e)} activeOpacity={0.8}>
          <Text style={styles.caption} numberOfLines={expanded ? undefined : 2}>
            {post.caption}
          </Text>
        </TouchableOpacity>
      ) : null}
      {post.location ? (
        <View style={styles.locationRow}>
          <MapPin size={12} color={Colors.mutedText} />
          <Text style={styles.locationText}>{post.location}</Text>
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

      {/* Actions */}
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
            {formatCount(fireCountState)}
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
          <TouchableOpacity style={styles.iconButton} onPress={openDetailWithComments} testID={`comment-button-${post.id}`}>
            <MessageCircle size={21} color={Colors.mutedText} />
            <Text style={styles.iconCount}>{formatCount(post.comment_count)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleSave}>
            <Bookmark
              size={21}
              color={isSaved ? Colors.flameOrange : Colors.mutedText}
              fill={isSaved ? Colors.flameOrange : "transparent"}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
            <Share2 size={21} color={Colors.mutedText} />
          </TouchableOpacity>
        </View>
      </View>

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
                <TouchableOpacity style={styles.menuItem} onPress={handleEdit} testID={`edit-post-${post.id}`}>
                  <Pencil size={20} color={Colors.text} />
                  <Text style={styles.menuItemText}>Edit Post</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={handleDelete} testID={`delete-post-${post.id}`} disabled={isDeleting}>
                  <Trash2 size={20} color={Colors.error} />
                  <Text style={[styles.menuItemText, { color: Colors.error }]}>Delete Post</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={handleReport} testID={`report-post-${post.id}`}>
                  <Flag size={20} color={Colors.mutedText} />
                  <Text style={styles.menuItemText}>Report Post</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={handleBlock} testID={`block-user-${post.id}`} disabled={isBlocking}>
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
                onPress={() => handleSelectReason(reason)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 14,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  menuItemDanger: {
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    marginRight: 8,
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
  media: {
    width: "100%",
    height: 340,
    backgroundColor: Colors.surfaceVariant,
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(15,15,15,0.7)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  categoryChip: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(15,15,15,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryText: {
    color: Colors.flameOrange,
    fontSize: 11,
    fontWeight: "700" as const,
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700" as const,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  caption: {
    color: "#CCCCCC",
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  locationText: {
    color: Colors.mutedText,
    fontSize: 12,
  },
  tryMeterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 14,
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
    paddingHorizontal: 12,
  },
  reactionPill: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 8,
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
    paddingHorizontal: 12,
    paddingTop: 12,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconCount: {
    color: Colors.mutedText,
    fontSize: 12,
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
