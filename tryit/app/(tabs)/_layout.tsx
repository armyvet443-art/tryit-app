import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Bell, Compass, Home, MessageCircle, PlusSquare, User } from "lucide-react-native";
import { Platform } from "react-native";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { getUnreadNotificationCount } from "@/services/tryit-service";
import { useQuery } from "@tanstack/react-query";

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
          position: "absolute",
          backgroundColor: Platform.OS === "web" ? "rgba(15,15,15,0.85)" : "transparent",
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "web" ? null : (
            <BlurView
              intensity={60}
              tint="dark"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          ),
        tabBarLabelStyle: {
          fontFamily: "Sora_600SemiBold",
          fontSize: 10,
          marginTop: 2,
        },
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontFamily: "Sora_700Bold" },
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
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => <MessageCircle size={24} color={color} />,
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
