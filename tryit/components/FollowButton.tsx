import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { setFollowing } from "@/services/tryit-service";

interface FollowButtonProps {
  targetUserId: string;
  isFollowing: boolean;
  onChanged?: (following: boolean) => void;
  compact?: boolean;
}

export default function FollowButton({
  targetUserId,
  isFollowing,
  onChanged,
  compact = false,
}: FollowButtonProps) {
  const { userId } = useAuth();
  const router = useRouter();
  const [following, setFollowingState] = useState<boolean>(isFollowing);
  const [busy, setBusy] = useState<boolean>(false);
  const busyRef = useRef<boolean>(false);

  // Don't render on own posts
  if (userId === targetUserId) return null;

  // Debounce — prevent duplicate calls from fast repeated taps
  const handlePress = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);

    if (!userId) {
      router.push("/auth/login");
      busyRef.current = false;
      setBusy(false);
      return;
    }

    // If already following, show unfollow confirmation sheet
    if (following) {
      Alert.alert(
        "Unfollow?",
        `Are you sure you want to unfollow?`,
        [
          { text: "Cancel", style: "cancel", onPress: () => {
            busyRef.current = false;
            setBusy(false);
          } },
          {
            text: "Unfollow",
            style: "destructive",
            onPress: async () => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFollowingState(false);
              try {
                await setFollowing(userId, targetUserId, false);
                onChanged?.(false);
              } catch (e) {
                console.log("[follow] unfollow failed", e);
                setFollowingState(true);
              } finally {
                busyRef.current = false;
                setBusy(false);
              }
            },
          },
        ],
      );
      return;
    }

    // Follow — optimistic
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFollowingState(true);
    try {
      await setFollowing(userId, targetUserId, true);
      onChanged?.(true);
    } catch (e) {
      console.log("[follow] failed", e);
      setFollowingState(false);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [userId, targetUserId, following, onChanged, router]);

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
