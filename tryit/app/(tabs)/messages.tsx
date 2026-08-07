import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pencil, Search, X } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
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
  getConversations,
  getOrCreateConversation,
  searchUsers,
} from "@/services/tryit-service";
import type { AuthorProfile, ConversationItem } from "@/types/models";
import { formatCount, timeAgo } from "@/utils/format";

export default function MessagesTabScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [searching, setSearching] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [starting, setStarting] = useState<boolean>(false);

  const conversationsQuery = useQuery<ConversationItem[]>({
    queryKey: ["conversations", userId],
    queryFn: () => getConversations(),
    enabled: userId !== null,
  });

  const userResults = useQuery<AuthorProfile[]>({
    queryKey: ["search-users-msg", query.trim()],
    queryFn: () => searchUsers(query.trim()),
    enabled: searching && query.trim().length > 0,
  });

  const handleStartChat = useCallback(
    async (targetId: string, displayName: string) => {
      if (starting || !userId) return;
      setStarting(true);
      try {
        const conversationId = await getOrCreateConversation(targetId);
        setSearching(false);
        setQuery("");
        router.push({
          pathname: "/messages/[id]",
          params: { id: conversationId, name: displayName },
        });
      } catch (e) {
        console.log("[messages] start chat failed", e);
      } finally {
        setStarting(false);
      }
    },
    [starting, userId, router],
  );

  if (!userId) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <EmptyState
          emoji="✉️"
          title="Log in to see your messages"
          subtitle="Sign up to chat with creators and friends."
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          testID="new-message-button"
          style={styles.newMsgBtn}
          onPress={() => setSearching((s) => !s)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Pencil size={22} color={Colors.flameOrange} />
        </TouchableOpacity>
      </View>

      {searching ? (
        <View style={styles.searchBar}>
          <Search size={18} color={Colors.mutedText} />
          <TextInput
            testID="msg-search-input"
            style={styles.searchInput}
            placeholder="Search people to message..."
            placeholderTextColor={Colors.inactiveIcon}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery("")}>
              <X size={18} color={Colors.mutedText} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {searching ? (
        userResults.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.flameOrange} />
          </View>
        ) : (
          <FlatList
            data={userResults.data ?? []}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                testID={`msg-user-${item.id}`}
                onPress={() => handleStartChat(item.id, item.display_name)}
                disabled={starting}
              >
                <Avatar uri={item.avatar_url} name={item.display_name} size={48} />
                <View style={styles.body}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.display_name}
                  </Text>
                  <Text style={styles.handle}>@{item.username}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              query.trim().length > 0 ? (
                <EmptyState
                  emoji="🔍"
                  title="No people found"
                  subtitle={`No results for "${query.trim()}" — try another name.`}
                />
              ) : (
                <EmptyState
                  emoji="🔍"
                  title="Search for someone"
                  subtitle="Type a name or username to start a conversation."
                />
              )
            }
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        )
      ) : conversationsQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.flameOrange} />
        </View>
      ) : (
        <FlatList
          data={conversationsQuery.data ?? []}
          keyExtractor={(item) => item.conversation_id}
          refreshControl={
            <RefreshControl
              refreshing={conversationsQuery.isRefetching}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["conversations", userId] })}
              tintColor={Colors.flameOrange}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              testID={`conversation-${item.conversation_id}`}
              onPress={() =>
                router.push({
                  pathname: "/messages/[id]",
                  params: { id: item.conversation_id, name: item.other_display_name },
                })
              }
            >
              <Avatar uri={item.other_avatar_url} name={item.other_display_name} size={48} />
              <View style={styles.body}>
                <View style={styles.topRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.other_display_name || `@${item.other_username}`}
                  </Text>
                  <Text style={styles.time}>{timeAgo(item.last_message_at)}</Text>
                </View>
                <View style={styles.bottomRow}>
                  <Text
                    style={[styles.preview, item.unread_count > 0 && styles.previewUnread]}
                    numberOfLines={1}
                  >
                    {item.last_message_text || "Say hi 👋"}
                  </Text>
                  {item.unread_count > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{formatCount(item.unread_count)}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState
              emoji="✉️"
              title="No conversations yet"
              subtitle="Tap the pencil button to start a new conversation."
            />
          }
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 32 }}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "800" as const,
  },
  newMsgBtn: {
    padding: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700" as const,
    flex: 1,
    marginRight: 8,
  },
  handle: {
    color: Colors.mutedText,
    fontSize: 13,
  },
  time: {
    color: Colors.mutedText,
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  preview: {
    color: Colors.mutedText,
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  previewUnread: {
    color: Colors.text,
    fontWeight: "600" as const,
  },
  badge: {
    backgroundColor: Colors.flameOrange,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700" as const,
  },
});
