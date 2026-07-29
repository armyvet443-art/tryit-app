-- post_likes table for the Fire (🔥) button — TryIt's signature like.
-- Supports both authenticated users and anonymous guests.

CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id text,
  type text NOT NULL DEFAULT 'fire',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one fire per user or guest per post.
CREATE UNIQUE INDEX IF NOT EXISTS post_likes_user_unique
  ON post_likes (post_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS post_likes_guest_unique
  ON post_likes (post_id, guest_id)
  WHERE guest_id IS NOT NULL;

-- Index for fast count queries.
CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON post_likes (post_id);

-- Add likes_count to posts for fast reads (denormalized counter).
ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes_count int NOT NULL DEFAULT 0;

-- RLS
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can read likes (needed for public counts).
CREATE POLICY "Anyone can read post_likes"
  ON post_likes FOR SELECT
  USING (true);

-- Authenticated users can insert/delete their own likes.
CREATE POLICY "Users can insert own likes"
  ON post_likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own likes"
  ON post_likes FOR DELETE
  USING (user_id = auth.uid());

-- Guests can insert/delete via guest_id (no auth check needed since
-- they have no auth.uid — the guest_id acts as the identifier).
CREATE POLICY "Guests can insert likes"
  ON post_likes FOR INSERT
  WITH CHECK (user_id IS NULL AND guest_id IS NOT NULL);

CREATE POLICY "Guests can delete likes"
  ON post_likes FOR DELETE
  USING (user_id IS NULL AND guest_id IS NOT NULL);
