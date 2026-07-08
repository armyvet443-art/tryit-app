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
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return attachAuthors((data ?? []) as Record<string, unknown>[]);
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
      return attachAuthors((data ?? []) as Record<string, unknown>[]);
    }
    if (feedType === "following" && userId) {
      const { data, error } = await supabase.rpc("get_strict_following_feed", {
        p_user_id: userId,
        p_offset: offset,
        p_limit: limit,
      });
      if (error) throw error;
      return attachAuthors((data ?? []) as Record<string, unknown>[]);
    }
    if (feedType === "trending") {
      const { data, error } = await supabase.rpc("get_trending_posts", {
        p_limit: limit,
        p_offset: offset,
        p_category: null,
      });
      if (error) throw error;
      return attachAuthors((data ?? []) as Record<string, unknown>[]);
    }
    if (feedType === "following" && !userId) return [];
    return fetchLatestPosts(offset, limit);
  } catch (e) {
    console.log("[feed] RPC failed, falling back to latest", e);
    if (feedType === "following") return [];
    return fetchLatestPosts(offset, limit);
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

export async function upsertReaction(
  postId: string,
  reaction: ReactionType,
  userId: string | null,
  guestId: string,
): Promise<void> {
  const { error } = await supabase.rpc("upsert_reaction", {
    p_post_id: postId,
    p_user_id: userId,
    p_reaction: reaction,
    p_guest_id: userId ? null : guestId,
  });
  if (error) throw error;
}

export async function deleteReaction(
  postId: string,
  userId: string | null,
  guestId: string,
): Promise<void> {
  const { error } = await supabase.rpc("delete_reaction", {
    p_post_id: postId,
    p_user_id: userId,
    p_guest_id: userId ? null : guestId,
  });
  if (error) throw error;
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

export async function getGuestReaction(postId: string, guestId: string): Promise<ReactionType | null> {
  const { data, error } = await supabase.rpc("get_guest_reaction", {
    p_post_id: postId,
    p_guest_id: guestId,
  });
  if (error) return null;
  const rows = (data ?? []) as Record<string, unknown>[];
  if (rows.length === 0) return null;
  return String(rows[0].reaction_type) as ReactionType;
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
  const userIds = Array.from(new Set(rows.map((r) => String(r.user_id))));
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, username, display_name, avatar_url, is_verified")
    .in("id", userIds);
  const profileMap = new Map<string, Record<string, unknown>>();
  (profiles ?? []).forEach((p: Record<string, unknown>) => profileMap.set(String(p.id), p));
  return rows.map((r) => ({
    id: String(r.id),
    post_id: String(r.post_id),
    user_id: String(r.user_id),
    parent_id: r.parent_id ? String(r.parent_id) : null,
    content: String(r.content ?? ""),
    created_at: String(r.created_at ?? ""),
    author: mapAuthor(profileMap.get(String(r.user_id))),
  }));
}

export async function addComment(postId: string, userId: string, content: string): Promise<void> {
  const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: userId, content });
  if (error) throw error;
}

/** Reply to a comment (sets parent_id). Uses the same comments table — no schema change. */
export async function addReply(postId: string, parentId: string, userId: string, content: string): Promise<void> {
  const { error } = await supabase
    .from("comments")
    .insert({ post_id: postId, parent_id: parentId, user_id: userId, content });
  if (error) throw error;
}

/** Delete a comment — RLS ensures only the owner can delete. */
export async function deleteComment(commentId: string, userId: string): Promise<void> {
  const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", userId);
  if (error) throw error;
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

// ─── Notifications ────────────────────────────────────────────────────────

export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    user_id: String(r.user_id),
    actor_id: r.actor_id ? String(r.actor_id) : null,
    post_id: r.post_id ? String(r.post_id) : null,
    notification_type: String(r.notification_type ?? "unknown"),
    message: String(r.message ?? ""),
    is_read: Boolean(r.is_read),
    created_at: String(r.created_at ?? ""),
  }));
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
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
  category: string;
  location: string;
}): Promise<void> {
  const { error } = await supabase.from("posts").insert({
    user_id: input.userId,
    title: input.title,
    caption: input.caption,
    media_url: input.mediaUrl,
    media_type: "image",
    category: input.category,
    location: input.location,
  });
  if (error) throw error;
}

// ─── Account ──────────────────────────────────────────────────────────────

export async function deleteAccount(userId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_user_account", { p_user_id: userId });
  if (error) throw error;
}

// ─── Guest → User Migration ───────────────────────────────────────────────

/**
 * Fetch guest reactions for migration. Re-reads the reactions table via
 * the guest_id column so we can re-submit them as user reactions on login.
 */
export async function getGuestReactionsForMigration(
  guestId: string,
): Promise<Array<{ post_id: string; reaction_type: ReactionType }>> {
  const { data, error } = await supabase
    .from("reactions")
    .select("post_id, reaction_type")
    .eq("guest_id", guestId)
    .is("user_id", null);
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    post_id: String(r.post_id),
    reaction_type: String(r.reaction_type) as ReactionType,
  }));
}

/**
 * Migrate guest reactions to the logged-in user by re-calling upsert_reaction
 * for each. The RPC handles the upsert so duplicates are merged, and RLS
 * allows the authenticated user to delete their old guest rows.
 */
export async function migrateGuestData(guestId: string, userId: string): Promise<number> {
  const guestReactions = await getGuestReactionsForMigration(guestId);
  let migrated = 0;
  for (const r of guestReactions) {
    try {
      await upsertReaction(r.post_id, r.reaction_type, userId, guestId);
      migrated++;
    } catch (e) {
      console.log("[migration] reaction failed", r.post_id, e);
    }
  }
  return migrated;
}
