import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Bookmark, Grid3x3, Globe, Instagram, Music2, Settings, User, Youtube } from "lucide-react-native";
import * as Linking from "expo-linking";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { getBookmarkedPosts, getTriedPosts, getUserPosts } from "@/services/tryit-service";
import type { TryPost } from "@/types/models";
import { formatCount } from "@/utils/format";

type TabKey = "posts" | "tried";

export default function ProfileScreen() {
  const { userId, profile, isProfileLoading } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tileSize = (width - 8) / 3;
  const [activeTab, setActiveTab] = useState<TabKey>("posts");

  const postsQuery = useQuery<TryPost[]>({
    queryKey: ["userPosts", userId],
    queryFn: () => getUserPosts(userId as string),
    enabled: userId !== null,
  });

  const triedQuery = useQuery<TryPost[]>({
    queryKey: ["triedPosts", userId],
    queryFn: () => getTriedPosts(userId as string),
    enabled: userId !== null,
  });

  const bookmarksQuery = useQuery<TryPost[]>({
    queryKey: ["bookmarkedPosts", userId],
    queryFn: () => getBookmarkedPosts(userId as string),
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
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/auth/login")} testID="profile-login-cta">
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

  const tabData = activeTab === "posts" ? (postsQuery.data ?? []) : (triedQuery.data ?? []);

  const openLink = (url: string) => {
    let full = url.trim();
    if (!full) return;
    if (full.startsWith("@")) {
      if (profile?.tiktok_url === url) {
        full = `https://tiktok.com/${full}`;
      } else {
        full = `https://instagram.com/${full}`;
      }
    }
    if (!full.startsWith("http")) full = `https://${full}`;
    Linking.openURL(full).catch(() => {});
  };

  const header = (
    <View>
      {/* Cover */}
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
            <TouchableOpacity style={styles.outlineButton} onPress={() => router.push("/edit-profile")} testID="edit-profile-button">
              <Text style={styles.outlineButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push("/settings")} testID="settings-button">
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

        {(profile.website || profile.instagram_url || profile.tiktok_url || profile.youtube_url) ? (
          <View style={styles.socialRow}>
            {profile.website ? (
              <TouchableOpacity style={styles.socialIcon} onPress={() => openLink(profile.website)}>
                <Globe size={18} color={Colors.text} />
              </TouchableOpacity>
            ) : null}
            {profile.instagram_url ? (
              <TouchableOpacity style={styles.socialIcon} onPress={() => openLink(profile.instagram_url)}>
                <Instagram size={18} color={Colors.text} />
              </TouchableOpacity>
            ) : null}
            {profile.tiktok_url ? (
              <TouchableOpacity style={styles.socialIcon} onPress={() => openLink(profile.tiktok_url)}>
                <Music2 size={18} color={Colors.text} />
              </TouchableOpacity>
            ) : null}
            {profile.youtube_url ? (
              <TouchableOpacity style={styles.socialIcon} onPress={() => openLink(profile.youtube_url)}>
                <Youtube size={18} color={Colors.text} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

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

        {/* Try Later / Tried quick actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push("/try-later")}
            testID="try-later-button"
          >
            <Bookmark size={18} color={Colors.flameOrange} />
            <Text style={styles.quickActionText}>Try Later ({formatCount(bookmarksQuery.data?.length ?? 0)})</Text>
          </TouchableOpacity>
          <View style={styles.quickActionDivider} />
          <View style={styles.quickActionBtn}>
            <Text style={styles.quickActionEmoji}>🔥</Text>
            <Text style={styles.quickActionText}>Tried ({formatCount(triedQuery.data?.length ?? 0)})</Text>
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
      ? { emoji: "📸", title: "No Tries yet", subtitle: "Post your first Try from the Create tab." }
      : { emoji: "🔥", title: "Nothing tried yet", subtitle: "Tap 'I Tried This' on any post to save it here." };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
        ListEmptyComponent={
          isLoading ? null : <EmptyState emoji={emptyText.emoji} title={emptyText.title} subtitle={emptyText.subtitle} />
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
  socialRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  socialIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingHorizontal: 8,
  },
  quickActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 12,
    marginTop: 14,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  quickActionDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
  },
  quickActionText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  quickActionEmoji: {
    fontSize: 16,
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
