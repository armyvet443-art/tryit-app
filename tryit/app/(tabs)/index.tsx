import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "@/components/EmptyState";
import PostCard from "@/components/PostCard";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import {
  FeedType,
  fetchFeed,
  getFireCountsBatch,
  getFollowingIds,
  getGuestFires,
  getGuestReactions,
  getMyFires,
  getMyReactions,
  getReactionCountsBatch,
  getSavedSet,
  getTriedSet,
} from "@/services/tryit-service";
import type { ReactionType, TryPost } from "@/types/models";

type ReactionCounts = Record<ReactionType, number>;

const PAGE_SIZE = 20;

const FEED_TABS: { key: FeedType; label: string; emoji: string }[] = [
  { key: "for_you", label: "For You", emoji: "✨" },
  { key: "following", label: "Following", emoji: "👥" },
  { key: "trending", label: "Trending", emoji: "📈" },
  { key: "latest", label: "Latest", emoji: "🕐" },
];

export default function FeedScreen() {
  const { userId, guestId } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [feedType, setFeedType] = useState<FeedType>("for_you");

  const feedQuery = useQuery<TryPost[]>({
    queryKey: ["feed", feedType, userId],
    queryFn: () => fetchFeed(feedType, userId, 0, PAGE_SIZE),
  });

  const posts = useMemo(() => feedQuery.data ?? [], [feedQuery.data]);
  const postIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const postIdsKey = postIds.join(",");

  const reactionsQuery = useQuery<Record<string, ReactionType>>({
    queryKey: ["myReactions", userId, guestId, postIdsKey],
    queryFn: () =>
      userId
        ? getMyReactions(postIds, userId)
        : getGuestReactions(postIds, guestId),
    enabled: postIds.length > 0 && (userId !== null || guestId.length > 0),
  });

  // Reaction counts read straight from the reactions table (batch) — no RPC,
  // no posts counter columns. This is what fills the Try Meter numbers.
  const countsQuery = useQuery<Record<string, ReactionCounts>>({
    queryKey: ["reactionCounts", postIdsKey],
    queryFn: () => getReactionCountsBatch(postIds),
    enabled: postIds.length > 0,
  });

  const triedQuery = useQuery<Set<string>>({
    queryKey: ["triedSet", userId, postIdsKey],
    queryFn: () => getTriedSet(postIds, userId as string),
    enabled: userId !== null && postIds.length > 0,
  });

  const savedQuery = useQuery<Set<string>>({
    queryKey: ["savedSet", userId, postIdsKey],
    queryFn: () => getSavedSet(postIds, userId as string),
    enabled: userId !== null && postIds.length > 0,
  });

  const followingQuery = useQuery<Set<string>>({
    queryKey: ["followingIds", userId],
    queryFn: () => getFollowingIds(userId as string),
    enabled: userId !== null,
  });

  const fireCountsQuery = useQuery<Record<string, number>>({
    queryKey: ["fireCounts", postIdsKey],
    queryFn: () => getFireCountsBatch(postIds),
    enabled: postIds.length > 0,
  });

  const myFiresQuery = useQuery<Set<string>>({
    queryKey: ["myFires", userId, guestId, postIdsKey],
    queryFn: () =>
      userId
        ? getMyFires(postIds, userId)
        : getGuestFires(postIds, guestId),
    enabled: postIds.length > 0 && (userId !== null || guestId.length > 0),
  });

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["feed", feedType, userId] });
    // Also refresh reaction/tried/saved/counts state so votes persist after pull-to-refresh
    queryClient.invalidateQueries({ queryKey: ["myReactions"] });
    queryClient.invalidateQueries({ queryKey: ["reactionCounts"] });
    queryClient.invalidateQueries({ queryKey: ["triedSet"] });
    queryClient.invalidateQueries({ queryKey: ["savedSet"] });
    queryClient.invalidateQueries({ queryKey: ["fireCounts"] });
    queryClient.invalidateQueries({ queryKey: ["myFires"] });
  }, [queryClient, feedType, userId]);

  const renderItem = useCallback(
    ({ item }: { item: TryPost }) => (
      <PostCard
        post={item}
        myReaction={reactionsQuery.data?.[item.id] ?? null}
        reactionCounts={countsQuery.data?.[item.id] ?? null}
        tried={triedQuery.data?.has(item.id) ?? false}
        saved={savedQuery.data?.has(item.id) ?? false}
        isFollowingAuthor={followingQuery.data?.has(item.user_id) ?? false}
        fired={myFiresQuery.data?.has(item.id) ?? false}
        fireCount={fireCountsQuery.data?.[item.id] ?? 0}
      />
    ),
    [reactionsQuery.data, countsQuery.data, triedQuery.data, savedQuery.data, followingQuery.data, myFiresQuery.data, fireCountsQuery.data],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.logo}>
          Try<Text style={styles.logoAccent}>It</Text> <Text style={styles.logoFlame}>🔥</Text>
        </Text>
        <TouchableOpacity
          testID="messages-button"
          onPress={() => (userId ? router.push("/messages") : router.push("/auth/login"))}
          style={styles.messagesButton}
        >
          <MessageCircle size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Feed type chips */}
      <View style={styles.chipsRow}>
        {FEED_TABS.map((tab) => {
          const active = feedType === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              testID={`feed-tab-${tab.key}`}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFeedType(tab.key)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {tab.emoji} {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {feedQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.flameOrange} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={feedQuery.isRefetching}
              onRefresh={onRefresh}
              tintColor={Colors.flameOrange}
            />
          }
          ListEmptyComponent={
            feedType === "following" && !userId ? (
              <EmptyState
                emoji="👥"
                title="Log in to see your Following feed"
                subtitle="Follow creators and their Tries will show up here."
              />
            ) : feedType === "following" ? (
              <EmptyState
                emoji="👥"
                title="No posts from people you follow yet"
                subtitle="Explore trending Tries and follow creators you like."
              />
            ) : (
              <EmptyState
                emoji="🔥"
                title="No Tries yet"
                subtitle="Be the first to share something you tried!"
              />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logo: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "800" as const,
  },
  logoAccent: {
    color: Colors.flameOrange,
  },
  logoFlame: {
    fontSize: 18,
  },
  messagesButton: {
    padding: 4,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: Colors.softGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: "rgba(255,106,0,0.15)",
    borderColor: Colors.flameOrange,
  },
  chipText: {
    color: Colors.mutedText,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  chipTextActive: {
    color: Colors.flameOrange,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 24,
  },
});
