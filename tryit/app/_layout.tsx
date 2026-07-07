import { useFonts } from "@expo-google-fonts/sora";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import Colors from "@/constants/colors";
import { fontMap } from "@/constants/typography";
import { AuthProvider } from "@/providers/AuthProvider";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontFamily: "Sora_600SemiBold" },
        headerBackTitle: "Back",
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ title: "Log In", presentation: "modal" }} />
      <Stack.Screen name="auth/signup" options={{ title: "Sign Up", presentation: "modal" }} />
      <Stack.Screen name="post/[id]" options={{ title: "Post" }} />
      <Stack.Screen name="user/[id]" options={{ title: "Profile" }} />
      <Stack.Screen name="messages/index" options={{ title: "Messages" }} />
      <Stack.Screen name="messages/[id]" options={{ title: "Chat" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="edit-profile" options={{ title: "Edit Profile" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontMap);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
          <StatusBar style="light" />
          <RootLayoutNav />
        </GestureHandlerRootView>
      </AuthProvider>
    </QueryClientProvider>
  );
}
