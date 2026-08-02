import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Search, X } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import {
  fetchCategoriesWithCounts,
  fetchFeed,
  filterBlockedPosts,
  getBlockedUserIds,
  getPostsByCategory,
  searchPosts,
  searchUsers,
  type CategoryWithCount,
} from "@/services/tryit-service";
import { CATEGORIES, type AuthorProfile, type TryPost } from "@/types/models";
import { formatCount } from "@/utils/format";

type SearchMode = "posts" | "users";

export default function ExploreScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState<string>("");
  const [mode, setMode] = useState<SearchMode>("posts");
  const [category, setCategory] = useState<string | null>(null);

  const trimmed = query.trim();
  const searching = trimmed.length > 0;

  // Fetch blocked user IDs to filter them from explore results.
  const blockedQuery = useQuery<Set<string>>({
    queryKey: ["blockedIds", userId],
    queryFn: () => getBlockedUserIds(userId, ""),
    staleTime: 30_000,
  });

  const trendingQuery = useQuery<TryPost[]>({
    queryKey: ["explore-trending"],
    queryFn: () => fetchFeed("trending", null, 0, 30),
    enabled: !searching && category === null,
  });

  // Dynamic categories from the database — falls back to the static CATEGORIES list.
  const categoriesQuery = useQuery<CategoryWithCount[]>({
    queryKey: ["explore-categories"],
    queryFn: () => fetchCategoriesWithCounts(30),
    staleTime: 60_000,
  });

  const categoryList = useMemo<CategoryWithCount[]>(() => {
    const dynamic = categoriesQuery.data ?? [];
    if (dynamic.length >= 3) {
      // Merge: ensure all dynamic categories are present, keep dynamic counts.
      const map = new Map<string, number>();
      for (const c of dynamic) map.set(c.name, c.count);
      // Also include any static categories not in dynamic (count 0).
      for (const s of CATEGORIES) {
        if (!map.has(s)) map.set(s, 0);
      }
      return Array.from(map.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    }
    // Fallback: static categories with count 0.
    return CATEGORIES.map((name) => ({ name, count: 0 }));
  }, [categoriesQuery.data]);

  const categoryQuery = useQuery<TryPost[]>({
    queryKey: ["explore-category", category],
    queryFn: () => getPostsByCategory(category as string),
    enabled: !searching && category !== null,
  });

  const postResults = useQuery<TryPost[]>({
    queryKey: ["search-posts", trimmed],
    queryFn: () => searchPosts(trimmed),
    enabled: searching && mode === "posts",
  });

  const userResults = useQuery<AuthorProfile[]>({
    queryKey: ["search-users", trimmed],
    queryFn: () => searchUsers(trimmed),
    enabled: searching && mode === "users",
  });

  const gridPosts = useMemo(() => {
    const blocked = blockedQuery.data ?? new Set();
    if (searching) return filterBlockedPosts(postResults.data ?? [], blocked);
    if (category) return filterBlockedPosts(categoryQuery.data ?? [], blocked);
    return filterBlockedPosts(trendingQuery.data ?? [], blocked);
  }, [searching, category, postResults.data, categoryQuery.data, trendingQuery.data, blockedQuery.data]);

  const isLoading =
    (searching && mode === "posts" && postResults.isLoading) ||
    (searching && mode === "users" && userResults.isLoading) ||
    (!searching && category === null && trendingQuery.isLoading) ||
    (!searching && category !== null && categoryQuery.isLoading);

  const renderPostTile = ({ item }: { item: TryPost }) => (
    <TouchableOpacity
      style={styles.tile}
      onPress={() => router.push({ pathname: "/post/[id]", params: { id: item.id } })}
    >
      {item.media_url ? (
        <Image source={{ uri: item.thumbnail_url ?? item.media_url }} style={styles.tileImage} contentFit="cover" />
      ) : (
        <View style={[styles.tileImage, styles.tilePlaceholder]}>
          <Text style={styles.tilePlaceholderEmoji}>🔥</Text>
        </View>
      )}
      <View style={styles.tileOverlay}>
        <Text style={styles.tileTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.tileMeta}>
          🔥 {formatCount(item.must_try_count)} · 💬 {formatCount(item.comment_count)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderUserRow = ({ item }: { item: AuthorProfile }) => (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => router.push({ pathname: "/user/[id]", params: { id: item.id } })}
    >
      <Avatar uri={item.avatar_url} name={item.display_name} size={44} />
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.userName}>{item.display_name}</Text>
          {item.is_verified ? <Text style={styles.verified}>✓</Text> : null}
        </View>
        <Text style={styles.userHandle}>@{item.username}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.heading}>Explore</Text>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Search size={18} color={Colors.mutedText} />
        <TextInput
          testID="explore-search-input"
          style={styles.searchInput}
          placeholder="Search Tries, categories, people..."
          placeholderTextColor={Colors.inactiveIcon}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <TouchableOpacity onPress={() => setQuery("")}>
            <X size={18} color={Colors.mutedText} />
          </TouchableOpacity>
        ) : null}
      </View>

      {searching ? (
        <View style={styles.modeRow}>
          {(["posts", "users"] as SearchMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeChip, mode === m && styles.modeChipActive]}
              onPress={() => setMode(m)}
            >
              <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                {m === "posts" ? "Tries" : "People"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll} contentContainerStyle={styles.categoriesContent}>
          <TouchableOpacity
            style={[styles.categoryChip, category === null && styles.categoryChipActive]}
            onPress={() => setCategory(null)}
          >
            <Text style={[styles.categoryText, category === null && styles.categoryTextActive]}>
              🔥 Trending
            </Text>
          </TouchableOpacity>
          {categoryList.map((c) => (
            <TouchableOpacity
              key={c.name}
              style={[styles.categoryChip, category === c.name && styles.categoryChipActive]}
              onPress={() => setCategory(c.name)}
            >
              <Text style={[styles.categoryText, category === c.name && styles.categoryTextActive]}>
                {c.name}
                {c.count > 0 ? `  ${formatCount(c.count)}` : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.flameOrange} />
        </View>
      ) : searching && mode === "users" ? (
        <FlatList
          data={userResults.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderUserRow}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState emoji="🔍" title="No people found" subtitle={`No results for '${trimmed}' — try another name.`} />}
        />
      ) : (
        <FlatList
          data={gridPosts}
          keyExtractor={(item) => item.id}
          renderItem={renderPostTile}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState emoji="🔍" title="Nothing here yet" subtitle={`No results for '${trimmed}' — try another category or search term.`} />}
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
  heading: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "800" as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.softGray,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    padding: 0,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modeChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: Colors.softGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeChipActive: {
    backgroundColor: "rgba(255,106,0,0.15)",
    borderColor: Colors.flameOrange,
  },
  modeText: {
    color: Colors.mutedText,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  modeTextActive: {
    color: Colors.flameOrange,
  },
  categoriesScroll: {
    maxHeight: 60,
  },
  categoriesContent: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  categoryText: {
    color: Colors.mutedText,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  categoryTextActive: {
    color: Colors.flameOrange,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  gridRow: {
    gap: 8,
  },
  tile: {
    flex: 1,
    marginBottom: 8,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tileImage: {
    width: "100%",
    height: 160,
    backgroundColor: Colors.surfaceVariant,
  },
  tilePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  tilePlaceholderEmoji: {
    fontSize: 32,
  },
  tileOverlay: {
    padding: 10,
    gap: 4,
  },
  tileTitle: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  tileMeta: {
    color: Colors.mutedText,
    fontSize: 11,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  userName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700" as const,
  },
  verified: {
    color: Colors.neonBlue,
    fontSize: 12,
    fontWeight: "700" as const,
  },
  userHandle: {
    color: Colors.mutedText,
    fontSize: 13,
  },
});
