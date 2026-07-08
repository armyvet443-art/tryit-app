import type { MediaItem, TryPost } from "@/types/models";

/**
 * Parse media items from a post. The TryIt posts table stores media_url as a
 * single string or a JSON array. We support both to avoid any backend change.
 */
export function parseMediaItems(post: TryPost): MediaItem[] {
  const raw = post.media_url;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((m) => {
        if (typeof m === "string") {
          return inferMediaItem(m, post.thumbnail_url);
        }
        return {
          url: String(m.url ?? m.media_url ?? ""),
          type: (m.type ?? m.media_type ?? "image") === "video" ? "video" : "image",
          thumbnail: m.thumbnail ?? m.thumbnail_url ?? null,
        };
      });
    }
  } catch {
    // not JSON — treat as single URL
  }
  if (raw.length > 0) return [inferMediaItem(raw, post.thumbnail_url)];
  return [];
}

function inferMediaItem(url: string, thumbnail: string | null): MediaItem {
  const lower = url.toLowerCase();
  const isVideo =
    lower.endsWith(".mp4") ||
    lower.endsWith(".mov") ||
    lower.endsWith(".webm") ||
    lower.includes("/video/") ||
    lower.includes("video");
  return {
    url,
    type: isVideo ? "video" : "image",
    thumbnail: isVideo ? thumbnail : null,
  };
}

/** Compact count formatting: 12400 -> "12.4K" */
export function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${count}`;
}

/** Relative time: "3h", "2d", "Just now" */
export function timeAgo(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (Number.isNaN(seconds) || seconds < 0) return "";
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
