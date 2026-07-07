import { useQuery } from "@tanstack/react-query";
import { Tabs } from "expo-router";
import { Bell, Compass, Home, PlusSquare, User } from "lucide-react-native";
import React from "react";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { getUnreadNotificationCount } from "@/services/tryit-service";

export default function TabLayout() {
  const { userId } = useAuth();

  const unreadQuery = useQuery<number>({
    queryKey: ["unreadNotifications", userId],
    queryFn: () => getUnreadNotificationCount(userId as string),
    enabled: userId !== null,
    refetchInterval: 30_000,
  });

  const unread = unreadQuery.data ?? 0;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.flameOrange,
        tabBarInactiveTintColor: Colors.inactiveIcon,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.border,
        },
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color }) => <Compass size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: ({ color }) => <PlusSquare size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color }) => <Bell size={24} color={color} />,
          tabBarBadge: unread > 0 ? (unread > 9 ? "9+" : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: Colors.flameOrange, color: "#FFFFFF", fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
