-- Fix Try Meter (reactions) and Fire button (post_likes) for anonymous guests.
--
-- Root causes (NOT RLS):
-- 1. reactions.user_id is NOT NULL → guest inserts (user_id=null) fail with 23502.
--    The check constraint reactions_user_or_guest_check already allows
--    (user_id IS NULL AND guest_id IS NOT NULL) but the NOT NULL fires first.
-- 2. post_likes table does not exist → every Fire tap hits PGRST205.
--
-- This migration makes user_id nullable, creates post_likes, and sets RLS
-- policies that allow anonymous guests to read/insert/delete on both tables.

-- ─── 1. Fix reactions table ────────────────────────────────────────────────

-- Make user_id nullable so guests can insert with user_id=NULL + guest_id set.
ALTER TABLE reactions ALTER COLUMN user_id DROP NOT NULL;

-- The existing check constraint should already allow (user_id IS NULL OR guest_id IS NULL).
-- Drop and recreate to be safe — exactly one of user_id/guest_id must be set.
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_user_or_guest_check;
ALTER TABLE reactions ADD CONSTRAINT reactions_user_or_guest_check
  CHECK (
    (user_id IS NOT NULL AND guest_id IS NULL) OR
    (user_id IS NULL AND guest_id IS NOT NULL)
  );

-- Ensure RLS is enabled and permissive (allow anon reads + guest writes).
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reactions_read_all" ON reactions;
CREATE POLICY "reactions_read_all" ON reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "reactions_guest_insert" ON reactions;
CREATE POLICY "reactions_guest_insert" ON reactions
  FOR INSERT WITH CHECK (user_id IS NULL AND guest_id IS NOT NULL);

DROP POLICY IF EXISTS "reactions_guest_delete" ON reactions;
CREATE POLICY "reactions_guest_delete" ON reactions
  FOR DELETE USING (user_id IS NULL AND guest_id IS NOT NULL);

DROP POLICY IF EXISTS "reactions_user_insert" ON reactions;
CREATE POLICY "reactions_user_insert" ON reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "reactions_user_delete" ON reactions;
CREATE POLICY "reactions_user_delete" ON reactions
  FOR DELETE USING (user_id = auth.uid());

-- ─── 2. Create post_likes table (Fire button) ──────────────────────────────

CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id text,
  type text NOT NULL DEFAULT 'fire',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_likes_user_or_guest_check CHECK (
    (user_id IS NOT NULL AND guest_id IS NULL) OR
    (user_id IS NULL AND guest_id IS NOT NULL)
  )
);

-- One fire per user or guest per post.
CREATE UNIQUE INDEX IF NOT EXISTS post_likes_user_unique
  ON post_likes (post_id, user_id) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS post_likes_guest_unique
  ON post_likes (post_id, guest_id) WHERE guest_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON post_likes (post_id);

-- Add likes_count to posts for fast reads (denormalized counter).
ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes_count int NOT NULL DEFAULT 0;

-- RLS for post_likes.
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_likes_read_all" ON post_likes;
CREATE POLICY "post_likes_read_all" ON post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "post_likes_guest_insert" ON post_likes;
CREATE POLICY "post_likes_guest_insert" ON post_likes
  FOR INSERT WITH CHECK (user_id IS NULL AND guest_id IS NOT NULL);

DROP POLICY IF EXISTS "post_likes_guest_delete" ON post_likes;
CREATE POLICY "post_likes_guest_delete" ON post_likes
  FOR DELETE USING (user_id IS NULL AND guest_id IS NOT NULL);

DROP POLICY IF EXISTS "post_likes_user_insert" ON post_likes;
CREATE POLICY "post_likes_user_insert" ON post_likes
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "post_likes_user_delete" ON post_likes;
CREATE POLICY "post_likes_user_delete" ON post_likes
  FOR DELETE USING (user_id = auth.uid());
