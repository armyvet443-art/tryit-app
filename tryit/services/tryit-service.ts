import AsyncStorage from "@react-native-async-storage/async-storage";
import { decode } from "base64-arraybuffer";

import { supabase } from "@/lib/supabase";
import type {
  AuthorProfile,
  CommentItem,
  ConversationItem,
  MessageItem,
  NotificationItem,
  ReactionType,
  TryPost,
  UserProfile,
} from "@/types/models";

export type FeedType = "for_you" | "following" | "trending" | "latest";

const GUEST_ID_KEY = "tryit_guest_id";

/** Persistent guest id for anonymous Try Meter voting (mirrors Flutter behavior). */
export async function getOrCreateGuestId(): Promise<string> {
  const stored = await AsyncStorage.getItem(GUEST_ID_KEY);
  if (stored && stored.length > 0) return stored;
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  await AsyncStorage.setItem(GUEST_ID_KEY, uuid);
  return uuid;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapAuthor(row: Record<string, unknown> | null | undefined): AuthorProfile | null {
  if (!row) return null;
  return {
    id: String(row.id ?? ""),
    username: String(row.username ?? ""),
    display_name: String(row.display_name ?? ""),
    avatar_url: String(row.avatar_url ?? ""),
    is_verified: Boolean(row.is_verified),
  };
}

function mapPost(row: Record<string, unknown>): TryPost {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    title: String(row.title ?? ""),
    caption: String(row.caption ?? ""),
    media_url: String(row.media_url ?? ""),
    media_type: String(row.media_type ?? "image"),
    thumbnail_url: row.thumbnail_url ? String(row.thumbnail_url) : null,
    category: String(row.category ?? ""),
    location: String(row.location ?? ""),
    try_score: num(row.try_score),
    try_score_count: num(row.try_score_count),
    must_try_count: num(row.must_try_count),
    worth_it_count: num(row.worth_it_count),
    maybe_count: num(row.maybe_count),
    not_for_me_count: num(row.not_for_me_count),
    comment_count: num(row.comment_count),
    tried_count: num(row.tried_count),
    likes_count: num(row.likes_count),
    created_at: String(row.created_at ?? ""),
    author: mapAuthor(row.user_profiles as Record<string, unknown> | null),
  };
}

/** Merge author profiles into post rows — same pattern the Flutter service used. */
async function attachAuthors(rows: Record<string, unknown>[]): Promise<TryPost[]> {
  if (rows.length === 0) return [];
  const userIds = Array.from(new Set(rows.map((r) => String(r.user_id))));
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, username, display_name, avatar_url, is_verified")
    .in("id", userIds);
  const profileMap = new Map<string, Record<string, unknown>>();
  (profiles ?? []).forEach((p: Record<string, unknown>) => profileMap.set(String(p.id), p));
  return rows.map((r) => mapPost({ ...r, user_profiles: profileMap.get(String(r.user_id)) ?? null }));
}

export async function fetchLatestPosts(offset: number, limit: number): Promise<TryPost[]> {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
 .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return await attachAuthors((data ?? []) as Record<string, unknown>[]);
  } catch (e) {
    console.log("[fetchLatestPosts] failed, returning []", e);
    return [];
  }
}

export async function fetchFeed(
  feedType: FeedType,
  userId: string | null,
 offset: number,
  limit: number,
): Promise<TryPost[]> {
  try {
    if (feedType === "for_you" && userId) {
      const { data, error } = await supabase.rpc("get_personalized_feed", {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset,
        p_feed_type: "for_you",
      });
      if (error) throw error;
      return await attachAuthors((data ?? []) as Record<string, unknown>[]);
    }
    if (feedType === "following" && userId) {
      const { data, error } = await supabase.rpc("get_strict_following_feed", {
        p_user_id: userId,
        p_offset: offset,
        p_limit: limit,
      });
      if (error) throw error;
      return await attachAuthors((data ?? []) as Record<string, unknown>[]);
    }
    if (feedType === "trending") {
      const { data, error } = await supabase.rpc("get_trending_posts", {
        p_limit: limit,
        p_offset: offset,
        p_category: null,
      });
      if (error) throw error;
      return await attachAuthors((data ?? []) as Record<string, unknown>[]);
    }
    if (feedType === "following" && !userId) return [];
    return await fetchLatestPosts(offset, limit);
  } catch (e) {
    console.log("[feed] RPC failed, falling back to latest", e);
    if (feedType === "following") return [];
    // Fallback must not throw — fetchLatestPosts already swallows network errors.
    return await fetchLatestPosts(offset, limit);
  }
}

export async function fetchPost(postId: string): Promise<TryPost | null> {
  const { data, error } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const posts = await attachAuthors([data as Record<string, unknown>]);
  return posts[0] ?? null;
}

// ─── Reactions (Try Meter) ────────────────────────────────────────────────
// Direct table operations on the `reactions` table — no RPC. This avoids the
// overloaded `upsert_reaction` function (uuid vs text p_guest_id) and the
// missing `post_reactions` table reference that caused every vote to fail and
// counts to revert to 0. Counts are read back from the same table so the UI
// stays in sync without relying on `posts` counter columns.

export type ReactionCounts = Record<ReactionType, number>;

function emptyCounts(): ReactionCounts {
  return { must_try: 0, worth_it: 0, maybe: 0, not_for_me: 0 };
}

/** Count reactions grouped by reaction_type for a single post. */
async function countReactions(postId: string): Promise<ReactionCounts> {
  const { data, error } = await supabase
    .from("reactions")
    .select("reaction_type")
    .eq("post_id", postId);
  if (error) {
    console.log("[countReactions] error", postId, error.message);
    return emptyCounts();
  }
  const counts = emptyCounts();
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const t = String(r.reaction_type) as ReactionType;
    if (t in counts) counts[t] += 1;
  }
  return counts;
}

/** Delete the existing reaction row for this user on the given post. Requires auth. */
async function deleteExistingReaction(postId: string, userId: string): Promise<void> {
  console.log("[deleteReaction] START", { postId, userId });
  const { error, count } = await supabase
    .from("reactions")
    .delete({ count: "exact" })
    .eq("post_id", postId)
    .eq("user_id", userId);
  console.log("[deleteReaction] result", { postId, userId, count, error: error ? { code: error.code, message: error.message, details: error.details, hint: error.hint } : null });
  if (error) throw error;
}

/**
 * Set or toggle a reaction. Pass `null` as `reaction` to un-react.
 * Requires authentication — guests cannot vote.
 *
 * Uses UPDATE-or-INSERT instead of DELETE-then-INSERT to avoid the flicker
 * (1 → 0) that occurred when changing reaction type (e.g. Maybe → Must Try).
 * The old approach deleted the row first, creating a window where the row was
 * missing — the INSERT then failed on the unique (post_id, user_id) constraint
 * or a realtime event fired during the gap, reverting the count to 0.
 *
 * UPDATE-or-INSERT avoids this entirely: if a row exists it's updated in a
 * single operation (no missing-row window); if not, a new row is inserted.
 * This works regardless of whether the unique index is partial or full.
 *
 * Returns the fresh counts read from the reactions table so callers can render
 * the result without an extra fetch and without flicker.
 */
export async function upsertReaction(
  postId: string,
  reaction: ReactionType | null,
  userId: string,
): Promise<ReactionCounts> {
  console.log("[upsertReaction] START", { postId, reaction, userId });

  if (!reaction) {
    // Toggle off — delete the existing row.
    await deleteExistingReaction(postId, userId);
  } else {
    // Try UPDATE first — no missing-row window, no flicker.
    const { data: updated, error: updateError } = await supabase
      .from("reactions")
      .update({ reaction_type: reaction })
      .eq("post_id", postId)
      .eq("user_id", userId)
      .select();
    console.log("[upsertReaction] UPDATE result", {
      postId,
      reaction,
      userId,
      updatedRows: updated ? updated.length : 0,
      updatedData: updated,
      error: updateError
        ? { code: updateError.code, message: updateError.message, details: updateError.details, hint: updateError.hint }
        : null,
    });
    if (updateError) {
      throw updateError;
    }
    // If no existing row was updated, this is a first-time vote — INSERT.
    if (!updated || updated.length === 0) {
      console.log("[upsertReaction] no row updated, attempting INSERT", { postId, reaction, userId });
      const { data: inserted, error: insertError } = await supabase
        .from("reactions")
        .insert({
          post_id: postId,
          reaction_type: reaction,
          user_id: userId,
        })
        .select();
      console.log("[upsertReaction] INSERT result", {
        postId,
        reaction,
        userId,
        insertedData: inserted,
        error: insertError
          ? { code: insertError.code, message: insertError.message, details: insertError.details, hint: insertError.hint }
          : null,
      });
      if (insertError) {
        throw insertError;
      }
    } else {
      console.log("[upsertReaction] row updated successfully, skipping INSERT", { postId, userId, rowsUpdated: updated.length });
    }
  }

  // Read back fresh counts directly (inline so we can log the raw rows)
  const { data: allReactions, error: countError } = await supabase
    .from("reactions")
    .select("reaction_type, user_id")
    .eq("post_id", postId);
  console.log("[upsertReaction] countReactions result", {
    postId,
    rowCount: allReactions ? allReactions.length : 0,
    allReactions,
    error: countError ? { code: countError.code, message: countError.message } : null,
  });

  if (countError) {
    console.log("[upsertReaction] countReactions error", postId, countError.message);
    return emptyCounts();
  }
  const counts = emptyCounts();
  for (const r of (allReactions ?? []) as Record<string, unknown>[]) {
    const t = String(r.reaction_type) as ReactionType;
    if (t in counts) counts[t] += 1;
  }
  console.log("[upsertReaction] END", { postId, userId, finalCounts: counts });
  return counts;
}

/** Un-react. Requires auth. Returns fresh counts. */
export async function deleteReaction(
  postId: string,
  userId: string,
): Promise<ReactionCounts> {
  await deleteExistingReaction(postId, userId);
  return countReactions(postId);
}

/** Batch-fetch reaction counts for many posts (used by the feed). */
export async function getReactionCountsBatch(
  postIds: string[],
): Promise<Record<string, ReactionCounts>> {
  if (postIds.length === 0) return {};
  const { data, error } = await supabase
    .from("reactions")
    .select("post_id, reaction_type")
    .in("post_id", postIds);
  if (error) {
    console.log("[getReactionCountsBatch] error", error.message);
    return {};
  }
  const map: Record<string, ReactionCounts> = {};
  for (const id of postIds) map[id] = emptyCounts();
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const pid = String(r.post_id);
    if (!map[pid]) map[pid] = emptyCounts();
    const t = String(r.reaction_type) as ReactionType;
    if (t in map[pid]) map[pid][t] += 1;
  }
  return map;
}

/** Fetch counts for a single post from the reactions table. */
export async function getReactionCounts(postId: string): Promise<ReactionCounts> {
  return countReactions(postId);
}

export async function getMyReactions(
  postIds: string[],
  userId: string,
): Promise<Record<string, ReactionType>> {
  if (postIds.length === 0) return {};
  const { data, error } = await supabase
    .from("reactions")
    .select("post_id, reaction_type")
    .eq("user_id", userId)
    .in("post_id", postIds);
  if (error) throw error;
  const map: Record<string, ReactionType> = {};
  (data ?? []).forEach((r: Record<string, unknown>) => {
    map[String(r.post_id)] = String(r.reaction_type) as ReactionType;
  });
  return map;
}



// ─── Fire (Likes) ────────────────────────────────────────────────────────
// Direct table operations on the `post_likes` table — no RPC needed.
// The Fire button is TryIt's signature like: tap to toggle a 🔥 on any post.

/** Toggle fire on/off for a post. Requires auth. Returns the updated like count. */
export async function toggleFire(
  postId: string,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.log("[toggleFire] check error", postId, error.message);
    throw error;
  }
  const alreadyFired = !!data;

  if (alreadyFired) {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("post_likes").insert({
      post_id: postId,
      type: "fire",
      user_id: userId,
    });
    if (error) {
      console.log("[toggleFire] insert error", postId, error.message);
      throw error;
    }
    // Best-effort: notify the post owner about the fire
    try {
      const { data: post } = await supabase
        .from("posts")
        .select("user_id, title")
        .eq("id", postId)
        .maybeSingle();
      if (post && post.user_id) {
        const postOwnerId = String(post.user_id);
        let actorName = "Someone";
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("display_name, username")
          .eq("id", userId)
          .maybeSingle();
        if (profile) {
          actorName = String(profile.display_name || profile.username || "Someone");
        }
        const postTitle = String(post.title ?? "your post");
        const snippet = postTitle.length > 30 ? postTitle.slice(0, 30) + "..." : postTitle;
        await createNotification({
          recipientId: postOwnerId,
          actorId: userId,
          actorGuestId: null,
          postId,
          type: "fire",
          message: `${actorName} fired your "${snippet}"`,
        });
      }
    } catch (e) {
      console.log("[toggleFire] notification failed", e);
    }
  }

  const count = await getFireCount(postId);
  return count;
}

/** Count total fires on a post. */
export async function getFireCount(postId: string): Promise<number> {
  const { count, error } = await supabase
    .from("post_likes")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);
  if (error) {
    console.log("[getFireCount] error", postId, error.message);
    return 0;
  }
  return count ?? 0;
}

/** Batch-fetch fire counts for many posts (used by the feed). */
export async function getFireCountsBatch(
  postIds: string[],
): Promise<Record<string, number>> {
  if (postIds.length === 0) return {};
  const { data, error } = await supabase
    .from("post_likes")
    .select("post_id")
    .in("post_id", postIds);
  if (error) {
    console.log("[getFireCountsBatch] error", error.message);
    return {};
  }
  const map: Record<string, number> = {};
  for (const id of postIds) map[id] = 0;
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const pid = String(r.post_id);
    if (!map[pid]) map[pid] = 0;
    map[pid] += 1;
  }
  return map;
}

/** Check which posts the current user has fired. */
export async function getMyFires(
  postIds: string[],
  userId: string,
): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);
  if (error) throw error;
  return new Set((data ?? []).map((r: Record<string, unknown>) => String(r.post_id)));
}

/** Check if a single post is fired by the current user. Requires auth. */
export async function isFired(
  postId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

// ─── Tried This / Saved ───────────────────────────────────────────────────

export async function getTriedSet(postIds: string[], userId: string): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("tried_this")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);
  if (error) throw error;
  return new Set((data ?? []).map((r: Record<string, unknown>) => String(r.post_id)));
}

export async function setTried(postId: string, userId: string, tried: boolean): Promise<void> {
  if (tried) {
    const { error } = await supabase
      .from("tried_this")
      .upsert({ post_id: postId, user_id: userId }, { onConflict: "post_id,user_id" });
    if (error) throw error;
    // Best-effort: notify the post owner
    try {
      const { data: post } = await supabase
        .from("posts")
        .select("user_id, title")
        .eq("id", postId)
        .maybeSingle();
      if (post && post.user_id) {
        const postOwnerId = String(post.user_id);
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("display_name, username")
          .eq("id", userId)
          .maybeSingle();
        const actorName = profile ? String(profile.display_name || profile.username || "Someone") : "Someone";
        const postTitle = String(post.title ?? "your post");
        const snippet = postTitle.length > 30 ? postTitle.slice(0, 30) + "..." : postTitle;
        await createNotification({
          recipientId: postOwnerId,
          actorId: userId,
          actorGuestId: null,
          postId,
          type: "tried",
          message: `${actorName} tried "${snippet}"`,
        });
      }
    } catch (e) {
      console.log("[setTried] notification failed", e);
    }
  } else {
    const { error } = await supabase.from("tried_this").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) throw error;
  }
}

export async function getSavedSet(postIds: string[], userId: string): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("saved_posts")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);
  if (error) throw error;
  return new Set((data ?? []).map((r: Record<string, unknown>) => String(r.post_id)));
}

export async function setSaved(postId: string, userId: string, saved: boolean): Promise<void> {
  if (saved) {
    const { error } = await supabase
      .from("saved_posts")
      .upsert({ post_id: postId, user_id: userId }, { onConflict: "post_id,user_id" });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) throw error;
  }
}

// ─── Comments ─────────────────────────────────────────────────────────────

export async function getComments(postId: string): Promise<CommentItem[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  if (rows.length === 0) return [];
  // Fetch profiles only for comments that have a user_id (guest comments have no profile).
  const userIds = Array.from(new Set(
    rows.filter((r) => r.user_id).map((r) => String(r.user_id)),
  ));
  let profileMap = new Map<string, Record<string, unknown>>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, username, display_name, avatar_url, is_verified")
      .in("id", userIds);
    (profiles ?? []).forEach((p: Record<string, unknown>) => profileMap.set(String(p.id), p));
  }
  return rows.map((r) => {
    const uid = r.user_id ? String(r.user_id) : null;
    const author = uid ? mapAuthor(profileMap.get(uid)) : null;
    return {
      id: String(r.id),
      post_id: String(r.post_id),
      user_id: uid ?? "",
      guest_id: r.guest_id ? String(r.guest_id) : null,
      parent_id: r.parent_id ? String(r.parent_id) : null,
      content: String(r.content ?? ""),
      created_at: String(r.created_at ?? ""),
      author,
    };
  });
}

/** Add a comment. Requires authentication — guests cannot comment.
 *  Also creates a notification for the post owner (best-effort). */
export async function addComment(
  postId: string,
  content: string,
  userId: string | null,
): Promise<void> {
  if (!userId) throw new Error("You must be signed in to comment.");
  const trimmed = content.trim();
  if (trimmed.length === 0) throw new Error("Comment cannot be empty.");
  if (trimmed.length > 280) throw new Error("Comment is too long (max 280 characters).");
  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    user_id: userId,
    content: trimmed,
  });
  if (error) {
    console.log("[addComment] insert error", postId, error.code, error.message);
    throw error;
  }
  // Best-effort: notify the post owner about the comment
  try {
    const { data: post } = await supabase
      .from("posts")
      .select("user_id, title")
      .eq("id", postId)
      .maybeSingle();
    if (post && post.user_id) {
      const postOwnerId = String(post.user_id);
      // Fetch commenter's display name for the notification message
      let commenterName = "Someone";
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("display_name, username")
        .eq("id", userId)
        .maybeSingle();
      if (profile) {
        commenterName = String(profile.display_name || profile.username || "Someone");
      }
      const postTitle = String(post.title ?? "your post");
      const snippet = postTitle.length > 30 ? postTitle.slice(0, 30) + "..." : postTitle;
      await createNotification({
        recipientId: postOwnerId,
        actorId: userId,
        actorGuestId: null,
        postId,
        type: "comment",
        message: `${commenterName} commented on "${snippet}"`,
      });
    }
  } catch (e) {
    console.log("[addComment] notification failed", e);
  }
}

/** Reply to a comment (sets parent_id). Requires authentication — guests cannot reply. */
export async function addReply(
  postId: string,
  parentId: string,
  content: string,
  userId: string | null,
): Promise<void> {
  if (!userId) throw new Error("You must be signed in to reply.");
  const trimmed = content.trim();
  if (trimmed.length === 0) throw new Error("Reply cannot be empty.");
  if (trimmed.length > 280) throw new Error("Reply is too long (max 280 characters).");
  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    parent_id: parentId,
    user_id: userId,
    content: trimmed,
  });
  if (error) {
    console.log("[addReply] insert error", postId, error.code, error.message);
    throw error;
  }
}

/** Delete a comment. Requires authentication — only the comment owner can delete.
 *  RLS policies enforce ownership on the server side as well. */
export async function deleteComment(
  commentId: string,
  userId: string | null,
): Promise<void> {
  if (!userId) throw new Error("You must be signed in to delete a comment.");
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId);
  if (error) {
    console.log("[deleteComment] error", commentId, error.code, error.message);
    throw error;
  }
}

// ─── Follows ──────────────────────────────────────────────────────────────

export async function getFollowingIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((r: Record<string, unknown>) => String(r.following_id)));
}

export async function setFollowing(userId: string, targetId: string, follow: boolean): Promise<void> {
  if (follow) {
    const { error } = await supabase
      .from("follows")
      .upsert({ follower_id: userId, following_id: targetId }, { onConflict: "follower_id,following_id" });
    if (error) throw error;
    // Best-effort: notify the followed user
    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("display_name, username")
        .eq("id", userId)
        .maybeSingle();
      const actorName = profile ? String(profile.display_name || profile.username || "Someone") : "Someone";
      await createNotification({
        recipientId: targetId,
        actorId: userId,
        actorGuestId: null,
        type: "follow",
        message: `${actorName} started following you`,
      });
    } catch (e) {
      console.log("[setFollowing] notification failed", e);
    }
  } else {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", userId)
      .eq("following_id", targetId);
    if (error) throw error;
  }
}

// ─── Profiles ─────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from("user_profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    id: String(r.id),
    username: String(r.username ?? ""),
    display_name: String(r.display_name ?? ""),
    email: String(r.email ?? ""),
    avatar_url: String(r.avatar_url ?? ""),
    cover_url: String(r.cover_url ?? ""),
    bio: String(r.bio ?? ""),
    is_verified: Boolean(r.is_verified),
    account_type: String(r.account_type ?? "personal"),
    followers_count: num(r.followers_count),
    following_count: num(r.following_count),
    total_tries: num(r.total_tries),
    avg_try_score: num(r.avg_try_score),
    current_streak: num(r.current_streak),
    longest_streak: num(r.longest_streak),
    created_at: String(r.created_at ?? ""),
  };
}

/** Check if a username is already taken by another user. Returns true if available. */
export async function checkUsernameAvailable(username: string, currentUserId: string): Promise<boolean> {
  const clean = username.trim().toLowerCase().replace(/\s+/g, "");
  if (clean.length === 0) return false;
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("username", clean)
    .neq("id", currentUserId)
    .maybeSingle();
  if (error) {
    console.log("[checkUsernameAvailable] error", error.message);
    return true; // Allow on error — don't block profile save
  }
  return !data;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, "display_name" | "username" | "bio" | "avatar_url" | "cover_url">>,
): Promise<void> {
  const { error } = await supabase
    .from("user_profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

export async function getUserPosts(userId: string): Promise<TryPost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return attachAuthors((data ?? []) as Record<string, unknown>[]);
}

/** Posts the user has bookmarked (Try Later queue) — joins saved_posts with posts. */
export async function getBookmarkedPosts(userId: string): Promise<TryPost[]> {
  const { data: savedRows, error: savedError } = await supabase
    .from("saved_posts")
    .select("post_id, created_at")
    .eq("user_id", userId);
  if (savedError) throw savedError;
  const saved = (savedRows ?? []) as Record<string, unknown>[];
  const postIds = saved.map((r) => String(r.post_id));
  if (postIds.length === 0) return [];
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .in("id", postIds);
  if (error) throw error;
  const posts = await attachAuthors((data ?? []) as Record<string, unknown>[]);
  // Re-sort by the saved_posts.created_at DESC (most recently saved first).
  const savedOrder = new Map(saved.map((r) => [String(r.post_id), String(r.created_at ?? "")]));
  return posts
    .map((p) => ({ ...p, _savedAt: savedOrder.get(p.id) ?? "" }))
    .sort((a, b) => (a._savedAt < b._savedAt ? 1 : -1))
    .map(({ _savedAt, ...rest }) => rest as TryPost);
}

/** Posts the user has marked as Tried — joins tried_this with posts. */
export async function getTriedPosts(userId: string): Promise<TryPost[]> {
  const { data: triedRows, error: triedError } = await supabase
    .from("tried_this")
    .select("post_id")
    .eq("user_id", userId);
  if (triedError) throw triedError;
  const postIds = ((triedRows ?? []) as Record<string, unknown>[]).map((r) => String(r.post_id));
  if (postIds.length === 0) return [];
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .in("id", postIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return attachAuthors((data ?? []) as Record<string, unknown>[]);
}

// ─── Search / Explore ─────────────────────────────────────────────────────

export async function searchUsers(query: string): Promise<AuthorProfile[]> {
  const q = query.trim();
  if (q.length === 0) return [];
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, username, display_name, avatar_url, is_verified")
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(25);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[])
    .map((r) => mapAuthor(r))
    .filter((a): a is AuthorProfile => a !== null);
}

export async function searchPosts(query: string): Promise<TryPost[]> {
  const q = query.trim();
  if (q.length === 0) return [];
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .or(`title.ilike.%${q}%,caption.ilike.%${q}%,category.ilike.%${q}%`)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return attachAuthors((data ?? []) as Record<string, unknown>[]);
}

export async function getPostsByCategory(category: string): Promise<TryPost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return attachAuthors((data ?? []) as Record<string, unknown>[]);
}

/** A category with its post count, for the Explore filter pills. */
export interface CategoryWithCount {
  name: string;
  count: number;
}

/**
 * Fetch the top categories by post count from the posts table.
 * Returns up to `limit` categories sorted by usage descending.
 */
export async function fetchCategoriesWithCounts(limit: number = 30): Promise<CategoryWithCount[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("category")
    .not("category", "is", null)
    .neq("category", "");
  if (error) {
    console.log("[fetchCategoriesWithCounts] error", error.message);
    return [];
  }
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const cat = String(row.category ?? "").trim();
    if (cat.length === 0) continue;
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ─── Notifications ────────────────────────────────────────────────────────

export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  if (rows.length === 0) return [];
  // Fetch actor profiles for notifications that have an actor_id
  const actorIds = Array.from(new Set(
    rows.filter((r) => r.actor_id).map((r) => String(r.actor_id)),
  ));
  let actorMap = new Map<string, Record<string, unknown>>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, username, display_name, avatar_url, is_verified")
      .in("id", actorIds);
    (profiles ?? []).forEach((p: Record<string, unknown>) => actorMap.set(String(p.id), p));
  }
  return rows.map((r) => {
    const aid = r.actor_id ? String(r.actor_id) : null;
    return {
      id: String(r.id),
      user_id: String(r.user_id),
      actor_id: aid,
      actor_guest_id: r.actor_guest_id ? String(r.actor_guest_id) : null,
      post_id: r.post_id ? String(r.post_id) : null,
      notification_type: String(r.notification_type ?? "unknown"),
      message: String(r.message ?? ""),
      is_read: Boolean(r.is_read),
      created_at: String(r.created_at ?? ""),
      actor: aid ? mapAuthor(actorMap.get(aid)) : null,
    };
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
}

/** Delete a single notification (recipient only — RLS enforces). */
export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase.from("notifications").delete().eq("id", notificationId);
  if (error) {
    console.log("[deleteNotification] error", notificationId, error.message);
    throw error;
  }
}

/** Create a notification. Skips if actor === recipient (don't notify yourself). */
export async function createNotification(input: {
  recipientId: string;
  actorId: string | null;
  actorGuestId: string | null;
  postId?: string | null;
  type: string;
  message: string;
}): Promise<void> {
  // Don't create notifications for your own actions
  if (input.actorId && input.actorId === input.recipientId) return;
  const row: Record<string, unknown> = {
    user_id: input.recipientId,
    notification_type: input.type,
    message: input.message,
  };
  if (input.actorId) {
    row.actor_id = input.actorId;
  }
  if (input.postId) row.post_id = input.postId;
  const { error } = await supabase.from("notifications").insert(row);
  if (error) {
    console.log("[createNotification] error", error.message);
    // Best-effort — don't throw, notifications are non-critical
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) return 0;
  return count ?? 0;
}

// ─── Messaging ────────────────────────────────────────────────────────────

export async function getConversations(): Promise<ConversationItem[]> {
  const { data, error } = await supabase.rpc("get_user_conversations");
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    conversation_id: String(r.conversation_id ?? r.id ?? ""),
    other_user_id: String(r.other_user_id ?? ""),
    other_username: String(r.other_username ?? ""),
    other_display_name: String(r.other_display_name ?? ""),
    other_avatar_url: String(r.other_avatar_url ?? ""),
    last_message_text: String(r.last_message_text ?? r.last_message ?? ""),
    last_message_at: r.last_message_at ? String(r.last_message_at) : null,
    unread_count: num(r.unread_count),
  }));
}

export async function getConversationMessages(conversationId: string): Promise<MessageItem[]> {
  const { data, error } = await supabase.rpc("get_conversation_messages", {
    p_conversation_id: conversationId,
    p_limit: 50,
  });
  if (error) throw error;
  const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    conversation_id: String(r.conversation_id ?? conversationId),
    sender_id: String(r.sender_id ?? ""),
    content: String(r.content ?? r.message_text ?? ""),
    message_type: String(r.message_type ?? "text"),
    media_url: r.media_url ? String(r.media_url) : null,
    created_at: String(r.created_at ?? ""),
  }));
  rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return rows;
}

export async function sendMessage(conversationId: string, content: string): Promise<void> {
  const { error } = await supabase.rpc("send_message", {
    p_conversation_id: conversationId,
    p_content: content,
  });
  if (error) throw error;
}

export async function getOrCreateConversation(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    other_user_id: otherUserId,
  });
  if (error) throw error;
  return String(data);
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
}

// ─── Storage ──────────────────────────────────────────────────────────────

/** Upload an image (base64) to post-media storage. */
export async function uploadPostMedia(base64: string, extension: string, userId: string): Promise<string> {
  const ext = extension.toLowerCase() === "png" ? "png" : "jpg";
  const contentType = ext === "png" ? "image/png" : "image/jpeg";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("post-media")
    .upload(path, decode(base64), { contentType, upsert: true });
  if (error) throw error;
  return supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
}

/** Upload a video (file URI) to post-media storage. Uses fetch→Blob to avoid base64 memory issues. */
export async function uploadPostVideo(uri: string, extension: string, userId: string): Promise<string> {
  const ext = extension.toLowerCase() === "mov" ? "mov" : "mp4";
  const contentType = ext === "mov" ? "video/quicktime" : "video/mp4";
  const path = `${userId}/${Date.now()}.${ext}`;
  console.log("[uploadPostVideo] uploading", { uri, ext, contentType, path });
  const response = await fetch(uri);
  const blob = await response.blob();
  console.log("[uploadPostVideo] blob size", blob.size, "type", blob.type);
  const { error } = await supabase.storage
    .from("post-media")
    .upload(path, blob, { contentType, upsert: false });
  if (error) {
    console.log("[uploadPostVideo] upload error", error.message);
    throw error;
  }
  const publicUrl = supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
  console.log("[uploadPostVideo] uploaded to", publicUrl);
  return publicUrl;
}

export async function uploadAvatar(base64: string, extension: string, userId: string): Promise<string> {
  const ext = extension.toLowerCase() === "png" ? "png" : "jpg";
  const contentType = ext === "png" ? "image/png" : "image/jpeg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, decode(base64), { contentType, upsert: true });
  if (error) throw error;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

/** Upload cover photo to the covers storage bucket (RLS-protected). */
export async function uploadCover(base64: string, extension: string, userId: string): Promise<string> {
  const ext = extension.toLowerCase() === "png" ? "png" : "jpg";
  const contentType = ext === "png" ? "image/png" : "image/jpeg";
  const path = `${userId}/cover-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("covers")
    .upload(path, decode(base64), { contentType, upsert: true });
  if (error) throw error;
  return supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
}

// ─── Posting ──────────────────────────────────────────────────────────────

export async function createPost(input: {
  userId: string;
  title: string;
  caption: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  category: string;
  location: string;
  /** Optional: multiple media items (photo + video collage). When provided,
   *  media_url is stored as a JSON array that parseMediaItems() can parse. */
  mediaItems?: { url: string; type: "image" | "video" }[];
}): Promise<void> {
  const hasMulti = input.mediaItems && input.mediaItems.length > 0;
  const mediaUrlValue = hasMulti
    ? JSON.stringify(input.mediaItems)
    : input.mediaUrl;
  const mediaTypeValue = hasMulti
    ? input.mediaItems![0].type
    : input.mediaType;
  const { error } = await supabase.from("posts").insert({
    user_id: input.userId,
    title: input.title,
    caption: input.caption,
    media_url: mediaUrlValue,
    media_type: mediaTypeValue,
    category: input.category,
    location: input.location,
  });
  if (error) throw error;
}

// ─── Edit / Delete Post ───────────────────────────────────────────────────

/** Extract the storage object path from a public media URL.
 *  e.g. https://xyz.supabase.co/storage/v1/object/public/post-media/userid/123.mp4
 *  → "userid/123.mp4"
 */
function extractStoragePath(publicUrl: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

/** Delete a post and all related data (reactions, likes, comments, storage file).
 *  Optimised for the common case — uses parallel deletes where possible. */
export async function deletePost(postId: string, mediaUrl: string): Promise<void> {
  // 1. Delete related rows in parallel
 const [r1, r2, r3] = await Promise.allSettled([
    supabase.from("reactions").delete().eq("post_id", postId),
    supabase.from("post_likes").delete().eq("post_id", postId),
    supabase.from("comments").delete().eq("post_id", postId),
  ]);
  // Log but don't throw — the post row deletion is the critical part.
  for (const r of [r1, r2, r3]) {
    if (r.status === "rejected") console.log("[deletePost] related cleanup failed", r.reason);
  }

  // 2. Delete the post row
  const { error: postError } = await supabase.from("posts").delete().eq("id", postId);
  if (postError) throw postError;

  // 3. Delete the media file from storage (best-effort)
  if (mediaUrl && mediaUrl.length > 0) {
    const path = extractStoragePath(mediaUrl, "post-media");
    if (path) {
      const { error: storageError } = await supabase.storage.from("post-media").remove([path]);
      if (storageError) console.log("[deletePost] storage cleanup failed", storageError.message);
    }
  }
}

/** Update a post's caption and/or category. */
export async function updatePost(
  postId: string,
  updates: { title?: string; caption?: string; category?: string },
): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.caption !== undefined) patch.caption = updates.caption;
  if (updates.category !== undefined) patch.category = updates.category;
  const { error } = await supabase.from("posts").update(patch).eq("id", postId);
  if (error) throw error;
}

// ─── Reports & Blocks ─────────────────────────────────────────────────────

export const REPORT_REASONS: string[] = [
  "Spam",
  "Harassment or Hate",
  "Nudity or Sexual",
  "False Information",
  "Other",
];

/** Report a post. Pass the reporter's userId or guestId. */
export async function reportPost(
  postId: string,
  reason: string,
  details: string | null,
  userId: string | null,
  guestId: string,
): Promise<void> {
  const row: Record<string, unknown> = {
    post_id: postId,
    reason,
    details: details ?? null,
  };
  if (userId) {
    row.reporter_id = userId;
    row.reporter_guest_id = null;
  } else {
    row.reporter_guest_id = guestId;
    row.reporter_id = null;
  }
  const { error } = await supabase.from("reports").insert(row);
  if (error) {
    console.log("[reportPost] error", postId, error.message);
    throw error;
  }
}

/** Report a user (not tied to a specific post). */
export async function reportUser(
  reportedUserId: string,
  reason: string,
  details: string | null,
  userId: string | null,
  guestId: string,
): Promise<void> {
  const row: Record<string, unknown> = {
    reported_user_id: reportedUserId,
    reason,
    details: details ?? null,
  };
  if (userId) {
    row.reporter_id = userId;
    row.reporter_guest_id = null;
  } else {
    row.reporter_guest_id = guestId;
    row.reporter_id = null;
  }
  const { error } = await supabase.from("reports").insert(row);
  if (error) {
    console.log("[reportUser] error", reportedUserId, error.message);
    throw error;
  }
}

/** Block a user. Prevents self-block and handles unique constraint violations gracefully. */
export async function blockUser(
  blockedUserId: string,
  userId: string | null,
  guestId: string,
): Promise<void> {
  if (userId && blockedUserId === userId) return; // Prevent self-block
  const row: Record<string, unknown> = {
    blocked_id: blockedUserId,
  };
  if (userId) {
    row.blocker_id = userId;
    row.blocker_guest_id = null;
  } else {
    row.blocker_guest_id = guestId;
    row.blocker_id = null;
  }
  const { error } = await supabase.from("blocks").insert(row);
  if (error) {
    // 23505 = unique constraint violation — already blocked, that's fine
    if (error.code !== "23505") {
      console.log("[blockUser] error", blockedUserId, error.message);
      throw error;
    }
  }
}

/** Unblock a user. */
export async function unblockUser(
  blockedUserId: string,
  userId: string | null,
  guestId: string,
): Promise<void> {
  let query = supabase.from("blocks").delete().eq("blocked_id", blockedUserId);
  if (userId) {
    query = query.eq("blocker_id", userId);
  } else {
    query = query.eq("blocker_guest_id", guestId).is("blocker_id", null);
  }
  const { error } = await query;
  if (error) {
    console.log("[unblockUser] error", blockedUserId, error.message);
    throw error;
  }
}

/** Fetch the set of blocked user IDs for the current user/guest. */
export async function getBlockedUserIds(
  userId: string | null,
  guestId: string,
): Promise<Set<string>> {
  let query = supabase.from("blocks").select("blocked_id");
  if (userId) {
    query = query.eq("blocker_id", userId);
  } else {
    query = query.eq("blocker_guest_id", guestId).is("blocker_id", null);
  }
  const { data, error } = await query;
  if (error) {
    console.log("[getBlockedUserIds] error", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((r: Record<string, unknown>) => String(r.blocked_id)));
}

/** Fetch blocked users with profile info for the settings screen. */
export interface BlockedUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

export async function getBlockedUsers(
  userId: string | null,
  guestId: string,
): Promise<BlockedUser[]> {
  let query = supabase.from("blocks").select("blocked_id");
  if (userId) {
    query = query.eq("blocker_id", userId);
  } else {
    query = query.eq("blocker_guest_id", guestId).is("blocker_id", null);
  }
  const { data, error } = await query;
  if (error) {
    console.log("[getBlockedUsers] error", error.message);
    return [];
  }
  const blockedIds = ((data ?? []) as Record<string, unknown>[]).map((r) => String(r.blocked_id));
  if (blockedIds.length === 0) return [];
  const { data: profiles, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", blockedIds);
  if (profileError) {
    console.log("[getBlockedUsers] profile error", profileError.message);
    return [];
  }
  return ((profiles ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    username: String(r.username ?? ""),
    display_name: String(r.display_name ?? ""),
    avatar_url: String(r.avatar_url ?? ""),
  }));
}

/** Filter posts to exclude those from blocked users (client-side). */
export function filterBlockedPosts(posts: TryPost[], blockedIds: Set<string>): TryPost[] {
  if (blockedIds.size === 0) return posts;
  return posts.filter((p) => !blockedIds.has(p.user_id));
}

// ─── Account ──────────────────────────────────────────────────────────────

export async function deleteAccount(userId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_user_account", { p_user_id: userId });
  if (error) throw error;
}

// ─── Guest → User Migration ───────────────────────────────────────────────
// Guest voting has been removed — all voting now requires authentication.
// The migration helper is kept as a no-op for backwards compatibility with
// the AuthProvider, which may still call it on login.

/** No-op: guest reactions are no longer migrated since voting requires auth. */
export async function migrateGuestData(_guestId: string, _userId: string): Promise<number> {
  return 0;
}
