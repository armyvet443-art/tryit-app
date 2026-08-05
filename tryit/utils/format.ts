import type { MediaItem, TryPost } from "@/types/models";

/**
 * Parse media items from a post. The TryIt posts table stores media_url as a
 * single string or a JSON array. We support both to avoid any backend change.
 */
function isValidUrl(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseMediaItems(post: TryPost): MediaItem[] {
  const raw = post.media_url;
  if (!isValidUrl(raw)) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((m) => {
          if (typeof m === "string") {
            return isValidUrl(m) ? inferMediaItem(m, post.thumbnail_url) : null;
          }
          const url = String(m.url ?? m.media_url ?? "").trim();
          if (url.length === 0) return null;
          const type = (m.type ?? m.media_type ?? "image") === "video" ? "video" : "image";
          return {
            url,
            type,
            thumbnail: isValidUrl(m.thumbnail) ? m.thumbnail : isValidUrl(m.thumbnail_url) ? m.thumbnail_url : null,
          } as MediaItem;
        })
        .filter((m): m is MediaItem => m !== null);
    }
  } catch {
    // not JSON — treat as single URL
  }
  return [inferMediaItem(raw, post.thumbnail_url)];
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
    thumbnail: isVideo ? (isValidUrl(thumbnail) ? thumbnail : null) : null,
  };
}

/** Compact count formatting: 12400 -> "12.4K" */
export function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${count}`;
}

/** Format seconds as M:SS or H:MM:SS for video durations. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/** Extract hashtags from a text string. Returns lowercase hashtags without the # prefix. */
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w]+/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
}

/** Check if a search query is a hashtag search (starts with #). */
export function isHashtagQuery(query: string): boolean {
  return query.trim().startsWith("#");
}

/** Normalize a hashtag query — strip the # prefix and lowercase. */
export function normalizeHashtag(query: string): string {
  return query.trim().replace(/^#/, "").toLowerCase();
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
