import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Settings, User } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { getUserPosts } from "@/services/tryit-service";
import type { TryPost } from "@/types/models";
import { formatCount } from "@/utils/format";

export default function ProfileScreen() {
  const { userId, profile, isProfileLoading } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tileSize = (width - 8) / 3;

  const postsQuery = useQuery<TryPost[]>({
    queryKey: ["userPosts", userId],
    queryFn: () => getUserPosts(userId as string),
    enabled: userId !== null,
  });

  if (!userId) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <User size={44} color={Colors.flameOrange} />
        <Text style={styles.authTitle}>Your TryIt profile</Text>
        <Text style={styles.authSubtitle}>
          Log in to track your streaks, Tries, followers and saved posts.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/auth/login")}>
          <Text style={styles.primaryButtonText}>Log In</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/auth/signup")}>
          <Text style={styles.linkText}>New here? Create an account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isProfileLoading || !profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.flameOrange} />
      </View>
    );
  }

  const header = (
    <View>
      {/* Cover */}
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
            <TouchableOpacity style={styles.outlineButton} onPress={() => router.push("/edit-profile")}>
              <Text style={styles.outlineButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push("/settings")}>
              <Settings size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.displayName}>{profile.display_name}</Text>
          {profile.is_verified ? <Text style={styles.verified}>✓</Text> : null}
        </View>
        <Text style={styles.username}>@{profile.username}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        {/* Stats */}
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

        {/* Streak card */}
        <View style={styles.streakCard}>
          <View style={styles.streakItem}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakValue}>{profile.current_streak}</Text>
            <Text style={styles.streakLabel}>Streak</Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakItem}>
            <Text style={styles.streakEmoji}>🏆</Text>
            <Text style={styles.streakValue}>{profile.longest_streak}</Text>
            <Text style={styles.streakLabel}>Best</Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakItem}>
            <Text style={styles.streakEmoji}>⭐</Text>
            <Text style={styles.streakValue}>{profile.avg_try_score.toFixed(1)}</Text>
            <Text style={styles.streakLabel}>Avg Score</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>My Tries</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
        ListEmptyComponent={
          <EmptyState emoji="📸" title="No Tries yet" subtitle="Post your first Try from the Create tab." />
        }
        contentContainerStyle={styles.listContent}
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
  iconButton: {
    padding: 6,
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
  streakCard: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 16,
  },
  streakItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  streakEmoji: {
    fontSize: 18,
  },
  streakValue: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800" as const,
  },
  streakLabel: {
    color: Colors.mutedText,
    fontSize: 11,
  },
  streakDivider: {
    width: 1,
    backgroundColor: Colors.border,
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
  listContent: {
    paddingBottom: 24,
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
  linkText: {
    color: Colors.neonBlue,
    fontSize: 14,
    fontWeight: "600" as const,
  },
});
