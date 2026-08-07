import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useRouter } from "expo-router";
import { Bookmark, Flag, Image as ImageIcon2, MapPin, MessageCircle, MoreHorizontal, Play, Share2, ShieldOff, Trash2, Pencil, Video as VideoIcon, Volume2, VolumeX, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import Avatar from "@/components/Avatar";
import CaptionText from "@/components/CaptionText";
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
import { REACTION_META, ReactionType, TryPost, MediaItem } from "@/types/models";
import { formatCount, formatDuration, parseMediaItems, timeAgo } from "@/utils/format";

/**
 * Inline video player for the feed — shows a muted autoplay loop with
 * a sound toggle and duration badge. Tapping opens the full post detail.
 */
/** Safely call a video player method — swallows NativeSharedObjectNotFoundException
 *  that fires when the native player has already been released during unmount. */
function safePlayerCall(fn: () => void): void {
  try {
    fn();
  } catch {
    // Native player object already released — safe to ignore during unmount/tab switch.
  }
}

function FeedVideoTile({ url, onDoubleTap, inView }: { url: string; onDoubleTap: () => void; inView: boolean }) {
  const [muted, setMuted] = useState<boolean>(true);
  const [duration, setDuration] = useState<number>(0);
  const [userPaused, setUserPaused] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.timeUpdateEventInterval = 0;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      safePlayerCall(() => player.pause());
    };
  }, [player]);

  // Play when in view and not user-paused; pause otherwise.
  // Reset userPaused when scrolling away so it auto-plays on return.
  useEffect(() => {
    if (!mountedRef.current) return;
    if (!inView) {
      setUserPaused(false);
      safePlayerCall(() => player.pause());
    } else if (!userPaused) {
      safePlayerCall(() => player.play());
    } else {
      safePlayerCall(() => player.pause());
    }
  }, [inView, userPaused, player]);

  useEffect(() => {
    if (!mountedRef.current) return;
    safePlayerCall(() => {
      player.muted = muted;
    });
  }, [muted, player]);

  useEventListener(player, "statusChange", ({ status }) => {
    if (!mountedRef.current) return;
    try {
      if (status === "readyToPlay" && player.duration > 0) {
        setDuration(player.duration);
      }
    } catch {
      /* player released */
    }
  });

  // Single tap = toggle play/pause; double tap = fire
  const singleTap = Gesture.Tap()
    .runOnJS(true)
    .onStart(() => {
      setUserPaused((prev) => !prev);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .runOnJS(true)
    .onStart(() => {
      onDoubleTap();
    });

  const composed = Gesture.Exclusive(doubleTap, singleTap);

  return (
    <View style={feedVideoStyles.container}>
      <GestureDetector gesture={composed}>
        <View style={feedVideoStyles.videoWrap}>
          <VideoView
            player={player}
            style={feedVideoStyles.video}
            contentFit="cover"
            nativeControls={false}
            allowsFullscreen
            allowsPictureInPicture
          />
          {userPaused ? (
            <View style={feedVideoStyles.pauseOverlay} pointerEvents="none">
              <View style={feedVideoStyles.playCircle}>
                <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </View>
          ) : null}
        </View>
      </GestureDetector>
      {/* Sound toggle */}
      <TouchableOpacity
        style={feedVideoStyles.soundBtn}
        onPress={() => setMuted((m) => !m)}
        testID="feed-video-sound-toggle"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        {muted ? <VolumeX size={16} color="#FFFFFF" /> : <Volume2 size={16} color="#FFFFFF" />}
      </TouchableOpacity>
      {/* Duration badge */}
      {duration > 0 ? (
        <View style={feedVideoStyles.durationBadge}>
          <Text style={feedVideoStyles.durationText}>{formatDuration(duration)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const feedVideoStyles = StyleSheet.create({
  container: {
    width: "100%",
    height: 340,
    backgroundColor: Colors.surfaceVariant,
    position: "relative",
  },
  videoWrap: {
    width: "100%",
    height: 340,
  },
  video: {
    width: "100%",
    height: 340,
  },
  pauseOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
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
  soundBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(15,15,15,0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  durationBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(15,15,15,0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 3,
  },
  durationText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700" as const,
  },
});

/** Compose single-tap (open fullscreen) + double-tap (fire) gestures for images. */
function composeImageGestures(onDoubleTap: () => void, onSingleTap: () => void) {
  const singleTap = Gesture.Tap().runOnJS(true).onStart(onSingleTap);
  const doubleTap = Gesture.Tap().numberOfTaps(2).runOnJS(true).onStart(onDoubleTap);
  return Gesture.Exclusive(doubleTap, singleTap);
}

/** Single collage slot with gesture-based single (fullscreen) + double (fire) tap. */
function CollageSlot({
  item,
  onSingleTap,
  onDoubleTap,
}: {
  item: MediaItem;
  onSingleTap: () => void;
  onDoubleTap: () => void;
}) {
  const gesture = composeImageGestures(onDoubleTap, onSingleTap);
  return (
    <GestureDetector gesture={gesture}>
      <View style={collageSlotStyles.slot}>
        <Image
          source={{ uri: item.thumbnail ?? item.url }}
          style={collageSlotStyles.media}
          contentFit="cover"
          transition={200}
          onError={() => console.warn("[PostCard] collage media load failed", item.url)}
        />
        {item.type === "video" ? (
          <View style={collageSlotStyles.playOverlay} pointerEvents="none">
            <View style={collageSlotStyles.playCircle}>
              <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>
        ) : null}
        <View style={collageSlotStyles.badge} pointerEvents="none">
          {item.type === "video" ? (
            <VideoIcon size={10} color="#FFFFFF" />
          ) : (
            <ImageIcon2 size={10} color="#FFFFFF" />
          )}
        </View>
      </View>
    </GestureDetector>
  );
}

const collageSlotStyles = StyleSheet.create({
  slot: {
    flex: 1,
    position: "relative",
  },
  media: {
    width: "100%",
    height: 280,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(15,15,15,0.7)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  badge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(15,15,15,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
});

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
  inView?: boolean;
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
  inView = true,
  onDeleted,
  onBlocked,
}: PostCardProps) {
  const { userId } = useAuth();
  const router = useRouter();

  // Owner check — only the logged-in user can edit/delete their own posts
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
  const reactionScale = React.useRef(new Animated.Value(1)).current;
  const heartAnim = React.useRef(new Animated.Value(0)).current;
  const fireBusyRef = useRef<boolean>(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

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

  const mediaItems = useMemo(() => parseMediaItems(post), [post]);

  const handleReact = useCallback(
    async (type: ReactionType) => {
      if (!userId) {
        setShowLoginModal(true);
        return;
      }
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const previous = reaction;
      // Optimistic update: toggle off if same, otherwise switch.
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
        const freshCounts = await upsertReaction(post.id, nextReaction, userId);
        setCounts(freshCounts);
      } catch (e) {
        console.log("[PostCard.handleReact] upsert failed", e);
        setReaction(previous);
        setCounts(counts);
      }
    },
    [reaction, counts, post.id, userId],
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
    if (fireBusyRef.current) return;
    fireBusyRef.current = true;
    if (!userId) {
      setShowLoginModal(true);
      fireBusyRef.current = false;
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(fireScale, { toValue: 1.3, duration: 80, useNativeDriver: true }),
      Animated.spring(fireScale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
    ]).start();
    const next = !isFired;
    setIsFired(next);
    setFireCountState((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const freshCount = await toggleFire(post.id, userId);
      setFireCountState(freshCount);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log("[fire] toggle failed", { postId: post.id, userId, error: msg });
      setIsFired(!next);
      setFireCountState((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      fireBusyRef.current = false;
    }
  }, [isFired, fireScale, post.id, userId]);

  /** Double-tap on media — triggers Fire + heart pop animation. */
  const handleDoubleTapFire = useCallback(() => {
    handleFire();
    heartAnim.setValue(0);
    Animated.sequence([
      Animated.timing(heartAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(heartAnim, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, [handleFire, heartAnim]);

  const [isSharePressed, setIsSharePressed] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  const handleShare = useCallback(async () => {
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
  }, [post.id, userId]);

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
  }, [selectedReason, isReporting, post.id, reportDetails, userId]);

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
              await blockUser(post.user_id, userId, "");
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
  }, [post.user_id, post.author?.username, userId, isBlocking, onBlocked]);

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

      {/* Media — collage if multiple items, single image otherwise */}
      {mediaItems.length > 1 ? (
        <View style={styles.collageRow}>
          {mediaItems.map((item, i) => (
            <CollageSlot
              key={item.url + i}
              item={item}
              onSingleTap={() => setFullscreenImage(item.thumbnail ?? item.url)}
              onDoubleTap={handleDoubleTapFire}
            />
          ))}
          {post.category ? (
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{post.category}</Text>
            </View>
          ) : null}
          {/* Heart pop overlay for double-tap fire */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heartPop,
              {
                opacity: heartAnim,
                transform: [
                  { scale: heartAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.2, 1] }) },
                ],
              },
            ]}
          >
            <Text style={styles.heartPopEmoji}>🔥</Text>
          </Animated.View>
        </View>
      ) : post.media_url ? (
        post.media_type === "video" ? (
          <View style={styles.mediaWrapRelative}>
            <FeedVideoTile
              url={post.media_url}
              onDoubleTap={handleDoubleTapFire}
              inView={inView}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.heartPop,
                {
                  opacity: heartAnim,
                  transform: [
                    { scale: heartAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.2, 1] }) },
                  ],
                },
              ]}
            >
              <Text style={styles.heartPopEmoji}>🔥</Text>
            </Animated.View>
          </View>
        ) : (
          <View style={styles.mediaWrapRelative}>
            <GestureDetector gesture={composeImageGestures(handleDoubleTapFire, () => setFullscreenImage(post.thumbnail_url ?? post.media_url))}>
              <View style={styles.imageGestureWrap}>
                <Image
                  source={{ uri: post.thumbnail_url ?? post.media_url }}
                  style={styles.media}
                  contentFit="cover"
                  transition={200}
                  onError={() => console.warn('[PostCard] media load failed for post', post.id, post.media_url)}
                />
                {post.category ? (
                  <View style={styles.categoryChip}>
                    <Text style={styles.categoryText}>{post.category}</Text>
                  </View>
                ) : null}
              </View>
            </GestureDetector>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.heartPop,
                {
                  opacity: heartAnim,
                  transform: [
                    { scale: heartAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.2, 1] }) },
                  ],
                },
              ]}
            >
              <Text style={styles.heartPopEmoji}>🔥</Text>
            </Animated.View>
          </View>
        )
      ) : null}

      {/* Title & caption */}
      <Text style={styles.title}>{post.title}</Text>
      {post.caption ? (
        <CaptionText
          text={post.caption}
          expanded={expanded}
          onToggleExpand={() => setExpanded((e) => !e)}
          style={styles.caption}
          numberOfLines={expanded ? undefined : 2}
        />
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
          <TouchableOpacity
            style={[styles.iconButton, { opacity: isSharePressed ? 0.7 : 1 }]}
            onPress={handleShare}
            onPressIn={() => setIsSharePressed(true)}
            onPressOut={() => setIsSharePressed(false)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Share2 size={21} color={Colors.mutedText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Login prompt for guests trying to vote or share */}
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
          <View style={styles.menuSheet}>
            <Text style={[styles.menuItemText, { textAlign: "center", paddingTop: 20, paddingBottom: 4 }]}>
              Sign in to vote and share
            </Text>
            <Text style={[styles.reasonText, { textAlign: "center", paddingBottom: 16, color: Colors.mutedText }]}>
              Join TryIt to react to posts and share with friends.
            </Text>
            <TouchableOpacity
              style={[styles.reportSubmitBtn, { marginBottom: 8 }]}
              onPress={() => {
                setShowLoginModal(false);
                router.push("/auth/login");
              }}
            >
              <Text style={styles.reportSubmitText}>Log In / Sign Up</Text>
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

      {/* Fullscreen image viewer */}
      <Modal
        visible={fullscreenImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenImage(null)}
      >
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setFullscreenImage(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {fullscreenImage ? (
            <Image
              source={{ uri: fullscreenImage }}
              style={styles.fullscreenImage}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          ) : null}
        </View>
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
  collageRow: {
    flexDirection: "row",
    gap: 2,
    height: 280,
    backgroundColor: Colors.surfaceVariant,
    position: "relative",
  },
  collageSlot: {
    flex: 1,
    position: "relative",
  },
  collageMedia: {
    width: "100%",
    height: 280,
    backgroundColor: Colors.surfaceVariant,
  },
  playOverlaySmall: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  playCircleSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(15,15,15,0.7)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  collageBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(15,15,15,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaWrapRelative: {
    position: "relative",
  },
  imageGestureWrap: {
    width: "100%",
    height: 340,
  },
  heartPop: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -40,
    marginTop: -40,
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  heartPopEmoji: {
    fontSize: 56,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
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
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  fullscreenImage: {
    width: "100%",
    height: "80%",
  },
});
