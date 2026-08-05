import { useEventListener } from "expo";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import type { MediaItem } from "@/types/models";
import { formatDuration } from "@/utils/format";

const SCREEN_WIDTH = Dimensions.get("window").width;
const MEDIA_HEIGHT = 360;

interface MediaCarouselProps {
  items: MediaItem[];
  onOpenDetail?: () => void;
}

/** Single video tile — expo-video with autoplay muted loop, sound toggle, duration. */
function VideoTile({ item, active }: { item: MediaItem; active: boolean }) {
  const [muted, setMuted] = useState<boolean>(true);
  const [duration, setDuration] = useState<number>(0);
  const player = useVideoPlayer(item.url, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    if (active) {
      player.play();
    } else {
      player.pause();
    }
  }, [active, player]);

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "readyToPlay" && player.duration > 0) {
      setDuration(player.duration);
    }
  });

  return (
    <View style={styles.mediaWrap}>
      <VideoView
        player={player}
        style={styles.media}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen
        allowsPictureInPicture
      />
      <TouchableOpacity
        style={styles.muteButton}
        onPress={() => setMuted((m) => !m)}
        testID="video-mute-toggle"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        {muted ? <VolumeX size={16} color="#FFFFFF" /> : <Volume2 size={16} color="#FFFFFF" />}
      </TouchableOpacity>
      {duration > 0 ? (
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Single image tile with tap-to-open-detail. */
function ImageTile({ item, onOpenDetail }: { item: MediaItem; onOpenDetail?: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.95} onPress={onOpenDetail} style={styles.mediaWrap}>
      <Image
        source={{ uri: item.thumbnail ?? item.url }}
        style={styles.media}
        contentFit="cover"
        transition={200}
        recyclingKey={item.url}
        cachePolicy="memory-disk"
        onError={() => console.warn('[MediaCarousel] image load failed', item.url)}
      />
    </TouchableOpacity>
  );
}

export default function MediaCarousel({ items, onOpenDetail }: MediaCarouselProps) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const scrollRef = useRef<ScrollView>(null);

  const validItems = items.filter((item) => typeof item.url === "string" && item.url.trim().length > 0);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (idx !== activeIndex) setActiveIndex(idx);
    },
    [activeIndex],
  );

  const goPrev = useCallback(() => {
    const next = Math.max(0, activeIndex - 1);
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
  }, [activeIndex]);

  const goNext = useCallback(() => {
    const next = Math.min(validItems.length - 1, activeIndex + 1);
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
  }, [activeIndex, validItems.length]);

  if (validItems.length === 0) return null;
  if (validItems.length === 1) {
    const item = validItems[0];
    return item.type === "video" ? (
      <VideoTile item={item} active />
    ) : (
      <ImageTile item={item} onOpenDetail={onOpenDetail} />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        {validItems.map((item, i) =>
          item.type === "video" ? (
            <View key={item.url + i} style={styles.page}>
              <VideoTile item={item} active={i === activeIndex} />
            </View>
          ) : (
            <View key={item.url + i} style={styles.page}>
              <ImageTile item={item} onOpenDetail={onOpenDetail} />
            </View>
          ),
        )}
      </ScrollView>

      {activeIndex > 0 ? (
        <TouchableOpacity style={[styles.nav, styles.navLeft]} onPress={goPrev} testID="carousel-prev">
          <ChevronLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
      {activeIndex < validItems.length - 1 ? (
        <TouchableOpacity style={[styles.nav, styles.navRight]} onPress={goNext} testID="carousel-next">
          <ChevronRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}

      <View style={styles.dots}>
        {validItems.map((item, i) => (
          <View key={item.url + i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {activeIndex + 1} / {validItems.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: MEDIA_HEIGHT,
    backgroundColor: Colors.surfaceVariant,
  },
  scroll: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    height: MEDIA_HEIGHT,
  },
  mediaWrap: {
    width: SCREEN_WIDTH,
    height: MEDIA_HEIGHT,
  },
  media: {
    width: SCREEN_WIDTH,
    height: MEDIA_HEIGHT,
  },
  nav: {
    position: "absolute",
    top: "50%",
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(15,15,15,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  navLeft: {
    left: 8,
  },
  navRight: {
    right: 8,
  },
  dots: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    backgroundColor: Colors.flameOrange,
    width: 18,
    borderRadius: 3,
  },
  counter: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(15,15,15,0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  counterText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700" as const,
  },
  muteButton: {
    position: "absolute",
    bottom: 10,
    left: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(15,15,15,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  durationBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(15,15,15,0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  durationText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700" as const,
  },
});
