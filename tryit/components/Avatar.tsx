import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
}

export default function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  const style = { width: size, height: size, borderRadius: size / 2 } as const;

  if (uri && uri.length > 0) {
    return <Image source={{ uri }} style={style} contentFit="cover" transition={150} />;
  }
  return (
    <View style={[styles.fallback, style]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: Colors.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  initial: {
    color: Colors.flameOrange,
    fontWeight: "700" as const,
  },
});
