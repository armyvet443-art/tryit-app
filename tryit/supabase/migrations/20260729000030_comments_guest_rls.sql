-- Comments system: add guest_id column + permissive RLS policies.
--
-- The comments table already exists but:
-- 1. Has no guest_id column → guests can't comment
-- 2. RLS blocks anon/authenticated inserts (42501)
--
-- This migration adds guest_id, makes user_id nullable, and creates
-- RLS policies matching the reactions/post_likes pattern.

-- ─── 1. Add guest_id + make user_id nullable ──────────────────────────────

ALTER TABLE comments ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE comments ADD COLUMN IF NOT EXISTS guest_id text;

-- One of user_id or guest_id must be set (but not both).
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_user_or_guest_check;
ALTER TABLE comments ADD CONSTRAINT comments_user_or_guest_check
  CHECK (
    (user_id IS NOT NULL AND guest_id IS NULL) OR
    (user_id IS NULL AND guest_id IS NOT NULL)
  );

-- Index for fast lookups by guest_id.
CREATE INDEX IF NOT EXISTS comments_guest_id_idx ON comments (guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments (post_id);

-- ─── 2. RLS policies ──────────────────────────────────────────────────────

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- SELECT: anyone can read comments.
DROP POLICY IF EXISTS "comments_read_all" ON comments;
CREATE POLICY "comments_read_all" ON comments FOR SELECT USING (true);

-- INSERT: authenticated users (user_id = auth.uid()).
DROP POLICY IF EXISTS "comments_user_insert" ON comments;
CREATE POLICY "comments_user_insert" ON comments
  FOR INSERT WITH CHECK (user_id = auth.uid() AND guest_id IS NULL);

-- INSERT: anonymous guests (guest_id set, user_id null).
DROP POLICY IF EXISTS "comments_guest_insert" ON comments;
CREATE POLICY "comments_guest_insert" ON comments
  FOR INSERT WITH CHECK (user_id IS NULL AND guest_id IS NOT NULL);

-- DELETE: authenticated users can delete their own comments.
DROP POLICY IF EXISTS "comments_user_delete" ON comments;
CREATE POLICY "comments_user_delete" ON comments
  FOR DELETE USING (user_id = auth.uid());

-- DELETE: guests can delete their own comments (matching guest_id).
DROP POLICY IF EXISTS "comments_guest_delete" ON comments;
CREATE POLICY "comments_guest_delete" ON comments
  FOR DELETE USING (user_id IS NULL AND guest_id IS NOT NULL);

-- UPDATE: authenticated users can update their own comments.
DROP POLICY IF EXISTS "comments_user_update" ON comments;
CREATE POLICY "comments_user_update" ON comments
  FOR UPDATE USING (user_id = auth.uid());
