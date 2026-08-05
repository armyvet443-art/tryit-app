import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Colors from "@/constants/colors";

interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ emoji, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.emojiCircle}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.actionButton} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 10,
  },
  emojiCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emoji: {
    fontSize: 36,
  },
  title: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "700" as const,
    textAlign: "center",
  },
  subtitle: {
    color: Colors.mutedText,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: Colors.flameOrange,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 16,
    marginTop: 8,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800" as const,
  },
});
