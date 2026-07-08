import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Grid3x3, MessageCircle } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import FollowButton from "@/components/FollowButton";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import {
  getFollowingIds,
  getOrCreateConversation,
  getProfile,
  getTriedPosts,
  getUserPosts,
} from "@/services/tryit-service";
import type { TryPost, UserProfile } from "@/types/models";
import { formatCount } from "@/utils/format";

type TabKey = "posts" | "tried";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const targetId = String(id ?? "");
  const { userId } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const tileSize = (width - 8) / 3;
  const [activeTab, setActiveTab] = useState<TabKey>("posts");

  const profileQuery = useQuery<UserProfile | null>({
    queryKey: ["profile", targetId],
    queryFn: () => getProfile(targetId),
    enabled: targetId.length > 0,
  });

  const postsQuery = useQuery<TryPost[]>({
    queryKey: ["userPosts", targetId],
    queryFn: () => getUserPosts(targetId),
    enabled: targetId.length > 0,
  });

  const triedQuery = useQuery<TryPost[]>({
    queryKey: ["triedPosts", targetId],
    queryFn: () => getTriedPosts(targetId),
    enabled: targetId.length > 0,
  });

  const followingQuery = useQuery<Set<string>>({
    queryKey: ["followingIds", userId],
    queryFn: () => getFollowingIds(userId as string),
    enabled: userId !== null,
  });

  const handleMessage = async () => {
    if (!userId) {
      router.push("/auth/login");
      return;
    }
    try {
      const conversationId = await getOrCreateConversation(targetId);
      router.push({
        pathname: "/messages/[id]",
        params: { id: conversationId, name: profileQuery.data?.display_name ?? "Chat" },
      });
    } catch (e) {
      console.log("[message] failed", e);
    }
  };

  const profile = profileQuery.data;

  if (profileQuery.isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.flameOrange} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <EmptyState emoji="🤷" title="User not found" />
      </View>
    );
  }

  const isOwn = profile.id === userId;
  const tabData = activeTab === "posts" ? (postsQuery.data ?? []) : (triedQuery.data ?? []);

  const header = (
    <View>
      {profile.cover_url ? (
        <Image source={{ uri: profile.cover_url }} style={styles.cover} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <LinearGradient colors={[Colors.flameOrange, "#992F00"]} style={styles.cover} />
      )}
      <View style={styles.headerContent}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrap}>
            <Avatar uri={profile.avatar_url} name={profile.display_name} size={84} />
          </View>
          <View style={styles.headerButtons}>
            {isOwn ? (
              <TouchableOpacity style={styles.outlineButton} onPress={() => router.push("/edit-profile")} testID="edit-profile-button">
                <Text style={styles.outlineButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <FollowButton
                targetUserId={profile.id}
                isFollowing={followingQuery.data?.has(profile.id) ?? false}
              />
            )}
            {!isOwn ? (
              <TouchableOpacity style={styles.messageButton} onPress={handleMessage} testID="message-user-button">
                <MessageCircle size={18} color={Colors.text} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.displayName}>{profile.display_name}</Text>
          {profile.is_verified ? <Text style={styles.verified}>✓</Text> : null}
        </View>
        <Text style={styles.username}>@{profile.username}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatCount(postsQuery.data?.length ?? 0)}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatCount(profile.followers_count)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatCount(profile.following_count)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatCount(profile.total_tries)}</Text>
            <Text style={styles.statLabel}>Tries</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "posts" && styles.tabActive]}
            onPress={() => setActiveTab("posts")}
            testID="tab-posts"
          >
            <Grid3x3 size={18} color={activeTab === "posts" ? Colors.flameOrange : Colors.mutedText} />
            <Text style={[styles.tabText, activeTab === "posts" && styles.tabTextActive]}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "tried" && styles.tabActive]}
            onPress={() => setActiveTab("tried")}
            testID="tab-tried"
          >
            <Text style={[styles.tabEmoji, activeTab === "tried" && styles.tabTextActive]}>🔥</Text>
            <Text style={[styles.tabText, activeTab === "tried" && styles.tabTextActive]}>Tried</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const isLoading = activeTab === "posts" ? postsQuery.isLoading : triedQuery.isLoading;
  const emptyText =
    activeTab === "posts"
      ? { emoji: "📸", title: "No posts yet" }
      : { emoji: "🔥", title: "Nothing tried yet" };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: profile.display_name }} />
      <FlatList
        data={tabData}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{ width: tileSize, height: tileSize, margin: 1 }}
            onPress={() => router.push({ pathname: "/post/[id]", params: { id: item.id } })}
          >
            {item.media_url ? (
              <Image
                source={{ uri: item.thumbnail_url ?? item.media_url }}
                style={styles.gridImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.gridImage, styles.gridPlaceholder]}>
                <Text numberOfLines={3} style={styles.gridTitle}>
                  {item.title}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={isLoading ? null : <EmptyState emoji={emptyText.emoji} title={emptyText.title} />}
        contentContainerStyle={{ paddingBottom: 24 }}
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
    alignItems: "center",
    justifyContent: "center",
  },
  cover: {
    width: "100%",
    height: 120,
    backgroundColor: Colors.surfaceVariant,
  },
  headerContent: {
    paddingHorizontal: 16,
  },
  avatarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: -36,
  },
  avatarWrap: {
    borderWidth: 3,
    borderColor: Colors.background,
    borderRadius: 46,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  outlineButtonText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  messageButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  displayName: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "800" as const,
  },
  verified: {
    color: Colors.neonBlue,
    fontSize: 15,
    fontWeight: "700" as const,
  },
  username: {
    color: Colors.mutedText,
    fontSize: 14,
    marginTop: 2,
  },
  bio: {
    color: "#CCCCCC",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingHorizontal: 8,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "800" as const,
  },
  statLabel: {
    color: Colors.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: "row",
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: Colors.flameOrange,
  },
  tabText: {
    color: Colors.mutedText,
    fontSize: 14,
    fontWeight: "700" as const,
  },
  tabTextActive: {
    color: Colors.flameOrange,
  },
  tabEmoji: {
    fontSize: 15,
  },
  gridImage: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.surfaceVariant,
  },
  gridPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  gridTitle: {
    color: Colors.mutedText,
    fontSize: 10,
    textAlign: "center",
  },
});
