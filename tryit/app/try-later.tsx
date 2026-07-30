import { useFocusEffect } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Bookmark, Flame, Trash2 } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import {
  getBookmarkedPosts,
  setSaved,
  setTried,
} from "@/services/tryit-service";
import type { TryPost } from "@/types/models";
import { formatCount, timeAgo } from "@/utils/format";

function toast(message: string) {
  if (typeof ToastAndroid !== "undefined") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
}

export default function TryLaterScreen() {
  const { userId, profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const bookmarksQuery = useQuery<TryPost[]>({
    queryKey: ["bookmarkedPosts", userId],
    queryFn: () => getBookmarkedPosts(userId as string),
    enabled: userId !== null,
  });

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts", userId] });
      }
    }, [userId, queryClient]),
  );

  const posts = bookmarksQuery.data ?? [];

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts", userId] });
    setRefreshing(false);
  }, [queryClient, userId]);

  const handleRemove = useCallback(
    async (postId: string) => {
      if (!userId || busyId) return;
      setBusyId(postId);
      // Optimistic: remove from list immediately
      queryClient.setQueryData<TryPost[]>(["bookmarkedPosts", userId], (old) =>
        (old ?? []).filter((p) => p.id !== postId),
      );
      try {
        await setSaved(postId, userId, false);
        toast("Removed from Try Later");
      } catch {
        toast("Failed to remove");
        // Revert on failure
        queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts", userId] });
      } finally {
        setBusyId(null);
      }
    },
    [userId, busyId, queryClient],
  );

  const handleTried = useCallback(
    async (post: TryPost) => {
      if (!userId || busyId) return;
      setBusyId(post.id);
      try {
        await setTried(post.id, userId, true);
        // Remove from Try Later queue once marked as tried
        await setSaved(post.id, userId, false);
        queryClient.setQueryData<TryPost[]>(["bookmarkedPosts", userId], (old) =>
          (old ?? []).filter((p) => p.id !== post.id),
        );
        queryClient.invalidateQueries({ queryKey: ["triedPosts", userId] });
        queryClient.invalidateQueries({ queryKey: ["myReactions"] });
        toast("Nice! Marked as tried");
      } catch {
        toast("Failed to mark as tried");
      } finally {
        setBusyId(null);
      }
    },
    [userId, busyId, queryClient],
  );

  if (!userId) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Bookmark size={44} color={Colors.flameOrange} />
        <Text style={styles.authTitle}>Your Try Later queue</Text>
        <Text style={styles.authSubtitle}>
          Log in to save posts you want to try and access your private queue anytime.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/auth/login")}
        >
          <Text style={styles.primaryButtonText}>Log In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = useCallback(
    ({ item }: { item: TryPost }) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: "/post/[id]", params: { id: item.id } })}
        activeOpacity={0.8}
      >
        <View style={styles.cardMedia}>
          {item.thumbnail_url || item.media_url ? (
            <Image
              source={{ uri: item.thumbnail_url ?? item.media_url }}
              style={styles.thumbnail}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Text style={styles.thumbnailEmoji}>🎣</Text>
            </View>
          )}
          {item.media_type === "video" ? (
            <View style={styles.videoBadge}>
              <Text style={styles.videoBadgeText}>▶</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.authorRow}>
            <Avatar uri={item.author?.avatar_url} name={item.author?.display_name} size={20} />
            <Text style={styles.authorName} numberOfLines={1}>
              @{item.author?.username ?? "unknown"}
            </Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.timeAgo}>{timeAgo(item.created_at)}</Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Flame size={13} color={Colors.flameOrange} />
              <Text style={styles.metaText}>{formatCount(item.must_try_count)} votes</Text>
            </View>
            {item.category ? (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.removeBtn]}
              onPress={() => handleRemove(item.id)}
              disabled={busyId === item.id}
              activeOpacity={0.7}
            >
              <Trash2 size={15} color={Colors.mutedText} />
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.triedBtn]}
              onPress={() => handleTried(item)}
              disabled={busyId === item.id}
              activeOpacity={0.7}
            >
              {busyId === item.id ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.triedEmoji}>🔥</Text>
                  <Text style={styles.triedText}>I Tried This!</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [busyId, handleRemove, handleTried, router],
  );

  const header = (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.headerInfo}>
        <Bookmark size={26} color={Colors.flameOrange} fill={Colors.flameOrange} />
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Try Later</Text>
          <Text style={styles.headerSubtitle}>
            Private queue · {posts.length} {posts.length === 1 ? "item" : "items"}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
          bookmarksQuery.isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={Colors.flameOrange} />
            </View>
          ) : (
            <EmptyState
              emoji="🔖"
              title="No saves yet"
              subtitle="Bookmark videos you want to try and they'll show up here in your private queue."
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.flameOrange}
            colors={[Colors.flameOrange]}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTop: {
    marginBottom: 12,
  },
  backText: {
    color: Colors.flameOrange,
    fontSize: 16,
    fontWeight: "700" as const,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "800" as const,
  },
  headerSubtitle: {
    color: Colors.mutedText,
    fontSize: 14,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 32,
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: "hidden",
    flexDirection: "row",
  },
  cardMedia: {
    width: 110,
    height: 130,
    backgroundColor: Colors.surfaceVariant,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailEmoji: {
    fontSize: 28,
  },
  videoBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  videoBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
  },
  cardBody: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700" as const,
    lineHeight: 18,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  authorName: {
    color: Colors.mutedText,
    fontSize: 12,
    fontWeight: "600" as const,
    flexShrink: 1,
  },
  dot: {
    color: Colors.mutedText,
    fontSize: 12,
  },
  timeAgo: {
    color: Colors.mutedText,
    fontSize: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    color: Colors.mutedText,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  categoryChip: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  categoryText: {
    color: Colors.mutedText,
    fontSize: 11,
    fontWeight: "600" as const,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 10,
    paddingVertical: 8,
    flex: 1,
  },
  removeBtn: {
    backgroundColor: Colors.surfaceVariant,
  },
  removeText: {
    color: Colors.mutedText,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  triedBtn: {
    backgroundColor: Colors.flameOrange,
  },
  triedEmoji: {
    fontSize: 13,
  },
  triedText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800" as const,
  },
  loadingWrap: {
    paddingVertical: 60,
    alignItems: "center",
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
  primaryButton: {
    backgroundColor: Colors.flameOrange,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800" as const,
  },
});
