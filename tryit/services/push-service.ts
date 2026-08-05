import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";

/**
 * Push notification service for TryIt.
 *
 * Uses Expo's push notification infrastructure:
 * 1. Request permission on first launch
 * 2. Get the Expo push token
 * 3. Store it in the push_tokens table linked to the user
 * 4. When createNotification() is called, also send a push via Expo Push API
 * 5. On notification tap, deep-link to the relevant post or user
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Request notification permissions. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === "granted";
}

/** Get the Expo push token for this device, or null if not available. */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    if (!projectId) {
      console.log("[push] no project ID found in env");
      return null;
    }
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenResponse.data ?? null;
  } catch (e) {
    console.log("[push] getExpoPushTokenAsync failed", e);
    return null;
  }
}

/** Register the push token with Supabase for the current user. */
export async function registerPushToken(userId: string): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) {
    console.log("[push] permission not granted, skipping registration");
    return;
  }

  const token = await getExpoPushToken();
  if (!token) {
    console.log("[push] no token obtained, skipping registration");
    return;
  }

  const platform = Platform.OS === "ios" ? "ios" : "android";

  const { error } = await supabase
    .from("push_tokens")
    .upsert(
      { user_id: userId, token, platform },
      { onConflict: "user_id,token" },
    );

  if (error) {
    console.log("[push] failed to register token", error.message);
  } else {
    console.log("[push] token registered for user", userId);
  }
}

/** Remove the push token for this user (called on sign out). */
export async function unregisterPushToken(userId: string): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;

  const { error } = await supabase
    .from("push_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("token", token);

  if (error) {
    console.log("[push] failed to unregister token", error.message);
  } else {
    console.log("[push] token unregistered for user", userId);
  }
}

/** Fetch all push tokens for a user from Supabase. */
async function getPushTokensForUser(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("user_id", userId);

  if (error) {
    console.log("[push] failed to fetch tokens", error.message);
    return [];
  }

  return ((data ?? []) as Record<string, unknown>[]).map((r) =>
    String(r.token),
  );
}

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Send a push notification to a user via Expo Push API. Best-effort. */
export async function sendPushNotification(
  recipientId: string,
  payload: PushPayload,
): Promise<void> {
  const tokens = await getPushTokensForUser(recipientId);
  if (tokens.length === 0) return;

  const messages = tokens.map((token) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    sound: "default",
    _displayInForeground: false,
  }));

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
    const result = await response.json();
    if (result.errors && result.errors.length > 0) {
      console.log("[push] Expo push API errors", result.errors);
    }
  } catch (e) {
    console.log("[push] failed to send push", e);
  }
}

/** Configure notification behavior for incoming notifications. Must be called early. */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
