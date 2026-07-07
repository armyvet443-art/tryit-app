import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
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

import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { getConversations } from "@/services/tryit-service";
import type { ConversationItem } from "@/types/models";
import { formatCount, timeAgo } from "@/utils/format";

export default function MessagesTabScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const conversationsQuery = useQuery<ConversationItem[]>({
    queryKey: ["conversations", userId],
    queryFn: () => getConversations(),
    enabled: userId !== null,
  });

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
      </View>
      {conversationsQuery.isLoading ? (
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
              subtitle="Visit a profile and tap the message icon to start chatting."
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 24,
    fontFamily: "Sora_800ExtraBold",
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
    fontFamily: "Sora_700Bold",
    flex: 1,
    marginRight: 8,
  },
  time: {
    color: Colors.mutedText,
    fontSize: 12,
    fontFamily: "Sora_400Regular",
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
    fontFamily: "Sora_400Regular",
  },
  previewUnread: {
    color: Colors.text,
    fontFamily: "Sora_600SemiBold",
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
    fontFamily: "Sora_700Bold",
  },
});
