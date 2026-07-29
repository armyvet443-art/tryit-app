import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowLeft, ShieldOff } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import {
  getBlockedUsers,
  type BlockedUser,
  unblockUser,
} from "@/services/tryit-service";

export default function BlockedUsersScreen() {
  const { userId, guestId } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const blockedQuery = useQuery<BlockedUser[]>({
    queryKey: ["blockedUsers", userId, guestId],
    queryFn: () => getBlockedUsers(userId, guestId),
  });

  const handleUnblock = useCallback(
    (user: BlockedUser) => {
      Alert.alert(
        `Unblock @${user.username}?`,
        "Their posts will appear in your feed again.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Unblock",
            onPress: async () => {
              setUnblockingId(user.id);
              try {
                await unblockUser(user.id, userId, guestId);
                queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
                queryClient.invalidateQueries({ queryKey: ["blockedIds"] });
                queryClient.invalidateQueries({ queryKey: ["feed"] });
                Alert.alert("Unblocked", `@${user.username} has been unblocked.`);
              } catch (e) {
                console.log("[unblock] failed", e);
                Alert.alert("Error", "Could not unblock this user. Please try again.");
              } finally {
                setUnblockingId(null);
              }
            },
          },
        ],
      );
    },
    [userId, guestId, queryClient],
  );

  const renderItem = useCallback(
    ({ item }: { item: BlockedUser }) => (
      <View style={styles.row}>
        <Avatar uri={item.avatar_url} name={item.display_name} size={44} />
        <View style={styles.userInfo}>
          <Text style={styles.displayName} numberOfLines={1}>
            {item.display_name}
          </Text>
          <Text style={styles.userHandle}>@{item.username}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.unblockBtn,
            unblockingId === item.id && styles.unblockBtnDisabled,
          ]}
          onPress={() => handleUnblock(item)}
          disabled={unblockingId === item.id}
          testID={`unblock-${item.id}`}
        >
          <Text style={styles.unblockText}>
            {unblockingId === item.id ? "..." : "Unblock"}
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [handleUnblock, unblockingId],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Blocked Users</Text>
        <View style={styles.backBtn} />
      </View>

      {blockedQuery.isLoading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (blockedQuery.data ?? []).length === 0 ? (
        <EmptyState
          emoji="🛡️"
          title="No blocked users"
          subtitle="People you block will appear here. You can unblock them anytime."
        />
      ) : (
        <FlatList
          data={blockedQuery.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: 6,
    width: 34,
  },
  title: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "700" as const,
  },
  loadingText: {
    color: Colors.mutedText,
    fontSize: 14,
    textAlign: "center",
    paddingTop: 40,
  },
  listContent: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700" as const,
  },
  userHandle: {
    color: Colors.mutedText,
    fontSize: 13,
    marginTop: 1,
  },
  unblockBtn: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unblockBtnDisabled: {
    opacity: 0.5,
  },
  unblockText: {
    color: Colors.flameOrange,
    fontSize: 13,
    fontWeight: "700" as const,
  },
});
