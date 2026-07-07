import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
import React, { useCallback, useEffect } from "react";
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
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { getNotifications, markAllNotificationsRead } from "@/services/tryit-service";
import type { NotificationItem } from "@/types/models";
import { timeAgo } from "@/utils/format";

function iconFor(type: string): string {
  switch (type) {
    case "follow":
      return "👥";
    case "comment":
      return "💬";
    case "reaction":
      return "🔥";
    case "tried":
      return "✅";
    case "message":
      return "✉️";
    case "streak_reminder":
      return "⚡";
    case "trending_post":
      return "📈";
    default:
      return "🔔";
  }
}

export default function AlertsScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery<NotificationItem[]>({
    queryKey: ["notifications", userId],
    queryFn: () => getNotifications(userId as string),
    enabled: userId !== null,
  });

  useEffect(() => {
    if (userId && (notificationsQuery.data?.some((n) => !n.is_read) ?? false)) {
      markAllNotificationsRead(userId)
        .then(() => queryClient.invalidateQueries({ queryKey: ["unreadNotifications", userId] }))
        .catch((e) => console.log("[alerts] mark read failed", e));
    }
  }, [userId, notificationsQuery.data, queryClient]);

  const renderItem = useCallback(
    ({ item }: { item: NotificationItem }) => (
      <TouchableOpacity
        style={[styles.row, !item.is_read && styles.rowUnread]}
        onPress={() => {
          if (item.post_id) {
            router.push({ pathname: "/post/[id]", params: { id: item.post_id } });
          } else if (item.actor_id) {
            router.push({ pathname: "/user/[id]", params: { id: item.actor_id } });
          }
        }}
      >
        <Text style={styles.icon}>{iconFor(item.notification_type)}</Text>
        <View style={styles.body}>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
        </View>
        {!item.is_read ? <View style={styles.dot} /> : null}
      </TouchableOpacity>
    ),
    [router],
  );

  if (!userId) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Bell size={44} color={Colors.flameOrange} />
        <Text style={styles.authTitle}>Stay in the loop</Text>
        <Text style={styles.authSubtitle}>Log in to see reactions, comments, follows and more.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/auth/login")}>
          <Text style={styles.primaryButtonText}>Log In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.heading}>Alerts</Text>
      {notificationsQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.flameOrange} />
        </View>
      ) : (
        <FlatList
          data={notificationsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={notificationsQuery.isRefetching}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["notifications", userId] })}
              tintColor={Colors.flameOrange}
            />
          }
          ListEmptyComponent={
            <EmptyState emoji="🔔" title="No alerts yet" subtitle="Activity on your Tries will show up here." />
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  heading: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "800" as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  listContent: {
    paddingBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowUnread: {
    backgroundColor: "rgba(255,106,0,0.06)",
  },
  icon: {
    fontSize: 22,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  message: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 19,
  },
  time: {
    color: Colors.mutedText,
    fontSize: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.flameOrange,
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
