-- Ensure posts.category is TEXT (not enum) so custom category values are allowed.
-- If the column is currently an enum type, this re-casts it to TEXT in-place.
ALTER TABLE posts
  ALTER COLUMN category TYPE TEXT USING category::text;

-- Add an index for category filtering (works for both enum and text).
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts (category);
