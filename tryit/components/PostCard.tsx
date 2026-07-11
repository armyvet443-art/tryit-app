import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Bookmark, MapPin, MessageCircle, Play, Share2 } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import {
  deleteReaction,
  setSaved,
  setTried,
  upsertReaction,
} from "@/services/tryit-service";
import { REACTION_META, ReactionType, TryPost } from "@/types/models";
import { formatCount, timeAgo } from "@/utils/format";

const REACTION_ORDER: ReactionType[] = ["must_try", "worth_it", "maybe", "not_for_me"];

interface PostCardProps {
  post: TryPost;
  myReaction: ReactionType | null;
  tried: boolean;
  saved: boolean;
  isFollowingAuthor: boolean;
  showFollow?: boolean;
}

export default function PostCard({
  post,
  myReaction,
  tried,
  saved,
  isFollowingAuthor,
  showFollow = true,
}: PostCardProps) {
  const { userId, guestId } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [reaction, setReaction] = useState<ReactionType | null>(myReaction);
  const [counts, setCounts] = useState<Record<ReactionType, number>>({
    must_try: post.must_try_count,
    worth_it: post.worth_it_count,
    maybe: post.maybe_count,
    not_for_me: post.not_for_me_count,
  });
  const [isTried, setIsTried] = useState<boolean>(tried);
  const [triedCount, setTriedCount] = useState<number>(post.tried_count);
  const [isSaved, setIsSaved] = useState<boolean>(saved);
  const [expanded, setExpanded] = useState<boolean>(false);

  useEffect(() => setReaction(myReaction), [myReaction]);
  useEffect(() => setIsTried(tried), [tried]);
  useEffect(() => setIsSaved(saved), [saved]);

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
          await deleteReaction(post.id, userId, guestId);
          queryClient.invalidateQueries({ queryKey: ["myReactions"] });
          queryClient.invalidateQueries({ queryKey: ["myReaction", userId, post.id] });
          queryClient.invalidateQueries({ queryKey: ["post", post.id] });
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
        await upsertReaction(post.id, type, userId, guestId);
        queryClient.invalidateQueries({ queryKey: ["myReactions"] });
        queryClient.invalidateQueries({ queryKey: ["myReaction", userId, post.id] });
        queryClient.invalidateQueries({ queryKey: ["post", post.id] });
      } catch (e) {
        console.log("[reaction] upsert failed", e);
        setReaction(previous);
        setCounts(counts);
      }
    },
    [reaction, counts, post.id, userId, guestId, queryClient],
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

  const handleShare = useCallback(() => {
    Share.share({ message: `${post.title} — see it on TryIt!` }).catch(() => {});
  }, [post.title]);

  const openAuthor = useCallback(() => {
    router.push({ pathname: "/user/[id]", params: { id: post.user_id } });
  }, [router, post.user_id]);

  const openDetail = useCallback(() => {
    router.push({ pathname: "/post/[id]", params: { id: post.id } });
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
        {showFollow && post.author ? (
          <FollowButton targetUserId={post.user_id} isFollowing={isFollowingAuthor} compact />
        ) : null}
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
          <TouchableOpacity style={styles.iconButton} onPress={openDetail}>
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
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 12,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconCount: {
    color: Colors.mutedText,
    fontSize: 12,
  },
});
