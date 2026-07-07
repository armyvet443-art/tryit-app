export type ReactionType = "must_try" | "worth_it" | "maybe" | "not_for_me";

export interface AuthorProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  is_verified: boolean;
}

export interface TryPost {
  id: string;
  user_id: string;
  title: string;
  caption: string;
  media_url: string;
  media_type: string;
  thumbnail_url: string | null;
  category: string;
  location: string;
  try_score: number;
  try_score_count: number;
  must_try_count: number;
  worth_it_count: number;
  maybe_count: number;
  not_for_me_count: number;
  comment_count: number;
  tried_count: number;
  created_at: string;
  author: AuthorProfile | null;
}

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url: string;
  cover_url: string;
  bio: string;
  is_verified: boolean;
  account_type: string;
  followers_count: number;
  following_count: number;
  total_tries: number;
  avg_try_score: number;
  current_streak: number;
  longest_streak: number;
  created_at: string;
}

export interface CommentItem {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author: AuthorProfile | null;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  actor_id: string | null;
  post_id: string | null;
  notification_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ConversationItem {
  conversation_id: string;
  other_user_id: string;
  other_username: string;
  other_display_name: string;
  other_avatar_url: string;
  last_message_text: string;
  last_message_at: string | null;
  unread_count: number;
}

export interface MessageItem {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  media_url: string | null;
  created_at: string;
}

export const REACTION_META: Record<
  ReactionType,
  { label: string; emoji: string; colorKey: "mustTry" | "worthIt" | "maybe" | "notForMe" }
> = {
  must_try: { label: "Must Try", emoji: "🔥", colorKey: "mustTry" },
  worth_it: { label: "Worth It", emoji: "💎", colorKey: "worthIt" },
  maybe: { label: "Maybe", emoji: "🤔", colorKey: "maybe" },
  not_for_me: { label: "Not for Me", emoji: "👎", colorKey: "notForMe" },
};

export const CATEGORIES: string[] = [
  "Fitness",
  "Food",
  "Outdoor",
  "Skills",
  "DIY",
  "Travel",
  "Tech",
  "Fashion",
  "Health",
  "Beauty",
  "Games",
  "Music",
];
