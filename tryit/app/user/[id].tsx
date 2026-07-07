import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import React, { useCallback } from "react";
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
  getUserPosts,
} from "@/services/tryit-service";
import type { TryPost, UserProfile } from "@/types/models";
import { formatCount } from "@/utils/format";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const targetId = String(id ?? "");
  const { userId } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const tileSize = (width - 8) / 3;

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

  const followingQuery = useQuery<Set<string>>({
    queryKey: ["followingIds", userId],
    queryFn: () => getFollowingIds(userId as string),
    enabled: userId !== null,
  });

  const handleMessage = useCallback(async () => {
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
  }, [userId, targetId, router, profileQuery.data]);

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

  const header = (
    <View>
      {profile.cover_url ? (
        <Image source={{ uri: profile.cover_url }} style={styles.cover} contentFit="cover" />
      ) : (
        <LinearGradient colors={[Colors.flameOrange, "#992F00"]} style={styles.cover} />
      )}
      <View style={styles.headerContent}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrap}>
            <Avatar uri={profile.avatar_url} name={profile.display_name} size={84} />
          </View>
          <View style={styles.headerButtons}>
            <FollowButton
              targetUserId={profile.id}
              isFollowing={followingQuery.data?.has(profile.id) ?? false}
            />
            <TouchableOpacity style={styles.messageButton} onPress={handleMessage} testID="message-user-button">
              <MessageCircle size={18} color={Colors.text} />
            </TouchableOpacity>
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

        <Text style={styles.sectionTitle}>Tries</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: profile.display_name }} />
      <FlatList
        data={postsQuery.data ?? []}
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
        ListEmptyComponent={<EmptyState emoji="📸" title="No Tries yet" />}
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
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800" as const,
    marginTop: 20,
    marginBottom: 10,
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
