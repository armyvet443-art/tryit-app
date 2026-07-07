import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity } from "react-native";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { setFollowing } from "@/services/tryit-service";

interface FollowButtonProps {
  targetUserId: string;
  isFollowing: boolean;
  onChanged?: (following: boolean) => void;
  compact?: boolean;
}

export default function FollowButton({ targetUserId, isFollowing, onChanged, compact = false }: FollowButtonProps) {
  const { userId } = useAuth();
  const router = useRouter();
  const [following, setFollowingState] = useState<boolean>(isFollowing);
  const [busy, setBusy] = useState<boolean>(false);

  if (userId === targetUserId) return null;

  const handlePress = async () => {
    if (!userId) {
      router.push("/auth/login");
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !following;
    setFollowingState(next);
    setBusy(true);
    try {
      await setFollowing(userId, targetUserId, next);
      onChanged?.(next);
    } catch (e) {
      console.log("[follow] failed", e);
      setFollowingState(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity
      testID={`follow-button-${targetUserId}`}
      style={[
        styles.button,
        compact && styles.compact,
        following ? styles.buttonFollowing : styles.buttonFollow,
      ]}
      onPress={handlePress}
      disabled={busy}
    >
      {busy ? (
        <ActivityIndicator size="small" color={following ? Colors.mutedText : "#FFFFFF"} />
      ) : (
        <Text style={[styles.label, following ? styles.labelFollowing : styles.labelFollow]}>
          {following ? "Following" : "Follow"}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  compact: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    minWidth: 76,
  },
  buttonFollow: {
    backgroundColor: Colors.flameOrange,
  },
  buttonFollowing: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  labelFollow: {
    color: "#FFFFFF",
  },
  labelFollowing: {
    color: Colors.mutedText,
  },
});
