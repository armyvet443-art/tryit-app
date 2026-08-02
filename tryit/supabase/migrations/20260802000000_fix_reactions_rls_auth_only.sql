-- Fix Try Meter RLS: allow any authenticated user to vote on ANY post.
-- Remove guest policies — voting now requires auth.
-- Also add posts UPDATE policy so title editing works.
--
-- SELECT = true for all, INSERT/UPDATE/DELETE WITH CHECK (auth.uid() = user_id).

-- ─── reactions table ─────────────────────────────────────────────────────
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Make user_id nullable (idempotent — may already be done by unapplied migration)
ALTER TABLE reactions ALTER COLUMN user_id DROP NOT NULL;

-- Relax the check constraint: allow user_id only (no guest_id needed),
-- but keep backwards compatibility for any old guest rows.
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_user_or_guest_check;
ALTER TABLE reactions ADD CONSTRAINT reactions_user_or_guest_check
  CHECK (
    (user_id IS NOT NULL AND guest_id IS NULL) OR
    (user_id IS NULL AND guest_id IS NOT NULL)
  );

-- SELECT: anyone can read counts
DROP POLICY IF EXISTS "reactions_read_all" ON reactions;
CREATE POLICY "reactions_read_all" ON reactions FOR SELECT USING (true);

-- INSERT: authenticated user can insert their OWN vote on ANY post
DROP POLICY IF EXISTS "reactions_guest_insert" ON reactions;
DROP POLICY IF EXISTS "reactions_user_insert" ON reactions;
CREATE POLICY "reactions_user_insert" ON reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- UPDATE: authenticated user can update their OWN vote
DROP POLICY IF EXISTS "reactions_user_update" ON reactions;
CREATE POLICY "reactions_user_update" ON reactions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DELETE: authenticated user can delete their OWN vote
DROP POLICY IF EXISTS "reactions_guest_delete" ON reactions;
DROP POLICY IF EXISTS "reactions_user_delete" ON reactions;
CREATE POLICY "reactions_user_delete" ON reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Ensure one vote per user per post (unique constraint)
CREATE UNIQUE INDEX IF NOT EXISTS reactions_user_unique
  ON reactions (post_id, user_id) WHERE user_id IS NOT NULL;

-- ─── post_likes table ────────────────────────────────────────────────────
-- Same treatment: auth-only, no guest inserts
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_likes_read_all" ON post_likes;
CREATE POLICY "post_likes_read_all" ON post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "post_likes_guest_insert" ON post_likes;
DROP POLICY IF EXISTS "post_likes_user_insert" ON post_likes;
CREATE POLICY "post_likes_user_insert" ON post_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "post_likes_user_update" ON post_likes;
CREATE POLICY "post_likes_user_update" ON post_likes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "post_likes_guest_delete" ON post_likes;
DROP POLICY IF EXISTS "post_likes_user_delete" ON post_likes;
CREATE POLICY "post_likes_user_delete" ON post_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── posts UPDATE policy (for title editing) ─────────────────────────────
-- Allow post owners to UPDATE their own posts (title, caption, category)
DROP POLICY IF EXISTS "posts_update_owner" ON posts;
CREATE POLICY "posts_update_owner" ON posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
