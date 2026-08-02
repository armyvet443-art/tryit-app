-- Fix Try Meter flicker (1 → 0) when changing vote on another user's post.
--
-- Root cause: The client used DELETE-then-INSERT (two separate API calls).
-- When switching reaction types (e.g. Maybe → Must Try), the DELETE succeeds
-- but the INSERT can fail on the unique constraint — the count reverts to 0.
--
-- Fix: Replace with a single .upsert() call with onConflict: 'post_id,user_id'.
-- For Postgres to infer the conflict target, the unique index must NOT be
-- partial (a WHERE clause on the index prevents ON CONFLICT inference when
-- the client doesn't include the predicate). Drop the partial index and
-- recreate it as a full unique index.
--
-- Note: PostgreSQL treats NULL values as distinct in unique indexes, so
-- multiple guest rows (user_id IS NULL) on the same post remain allowed.

DROP INDEX IF EXISTS reactions_user_unique;

CREATE UNIQUE INDEX reactions_user_unique
  ON reactions (post_id, user_id);
