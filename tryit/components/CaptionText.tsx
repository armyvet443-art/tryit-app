import { useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Colors from "@/constants/colors";

/**
 * Renders a caption with tappable hashtags. Tapping a hashtag navigates
 * to the Explore screen with that hashtag as the search query.
 */
interface CaptionTextProps {
  text: string;
  expanded?: boolean;
  style?: object;
  onToggleExpand?: () => void;
  numberOfLines?: number;
}

const HASHTAG_REGEX = /(#[\w]+)/g;

export default function CaptionText({
  text,
  expanded = false,
  style,
  onToggleExpand,
  numberOfLines,
}: CaptionTextProps) {
  const router = useRouter();

  const segments = useMemo(() => {
    const parts: { text: string; isHashtag: boolean }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const regex = new RegExp(HASHTAG_REGEX.source, "g");
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), isHashtag: false });
      }
      parts.push({ text: match[0], isHashtag: true });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), isHashtag: false });
    }
    return parts;
  }, [text]);

  const handleHashtagPress = useCallback(
    (tag: string) => {
      const query = tag.startsWith("#") ? tag : `#${tag}`;
      router.push({ pathname: "/(tabs)/explore", params: { q: query } });
    },
    [router],
  );

  if (onToggleExpand) {
    return (
      <TouchableOpacity onPress={onToggleExpand} activeOpacity={0.8}>
        <Text style={[styles.caption, style]} numberOfLines={numberOfLines}>
          {segments.map((seg, i) =>
            seg.isHashtag ? (
              <Text
                key={i}
                style={styles.hashtag}
                onPress={() => handleHashtagPress(seg.text)}
              >
                {seg.text}
              </Text>
            ) : (
              <React.Fragment key={i}>{seg.text}</React.Fragment>
            ),
          )}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View>
      <Text style={[styles.caption, style]} numberOfLines={numberOfLines}>
        {segments.map((seg, i) =>
          seg.isHashtag ? (
            <Text
              key={i}
              style={styles.hashtag}
              onPress={() => handleHashtagPress(seg.text)}
            >
              {seg.text}
            </Text>
          ) : (
            <React.Fragment key={i}>{seg.text}</React.Fragment>
          ),
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: "#CCCCCC",
    fontSize: 14,
    lineHeight: 20,
  },
  hashtag: {
    color: Colors.flameOrange,
    fontWeight: "600" as const,
  },
});
