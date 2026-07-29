-- ─── Reports table ────────────────────────────────────────────────────────
-- Stores user/guest reports of posts or other users for moderation.

CREATE TABLE IF NOT EXISTS public.reports (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id      uuid,          -- nullable: null if reported by a guest
  reporter_guest_id text,         -- nullable: null if reported by authed user
  post_id          uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  reported_user_id uuid,          -- the user being reported (may differ from post author)
  reason           text NOT NULL, -- Spam, Harassment, Inappropriate, False Info, Other
  details          text,          -- optional extra context from the reporter
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users/guests can only see their own reports (for status); inserts are open.
DROP POLICY IF EXISTS "reports_select_own" ON public.reports;
CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT USING (
    reporter_id = auth.uid()
    OR (reporter_id IS NULL AND reporter_guest_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "reports_insert_all" ON public.reports;
CREATE POLICY "reports_insert_all" ON public.reports
  FOR INSERT WITH CHECK (true);

-- No update or delete policies for users — only admins can manage reports.

-- ─── Blocks table ─────────────────────────────────────────────────────────
-- Stores user/guest blocks. Blocking hides the blocked user's posts/comments.

CREATE TABLE IF NOT EXISTS public.blocks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id        uuid,          -- nullable: null if blocked by a guest
  blocker_guest_id  text,          -- nullable: null if blocked by authed user
  blocked_id        uuid NOT NULL, -- the user being blocked
  blocked_guest_id  text,          -- the guest being blocked (if applicable)
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  UNIQUE (blocker_guest_id, blocked_guest_id)
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Users/guests can only see their own blocks.
DROP POLICY IF EXISTS "blocks_select_own" ON public.blocks;
CREATE POLICY "blocks_select_own" ON public.blocks
  FOR SELECT USING (
    blocker_id = auth.uid()
    OR (blocker_id IS NULL AND blocker_guest_id IS NOT NULL)
  );

-- Users/guests can insert/delete their own blocks.
DROP POLICY IF EXISTS "blocks_insert_own" ON public.blocks;
CREATE POLICY "blocks_insert_own" ON public.blocks
  FOR INSERT WITH CHECK (
    blocker_id = auth.uid()
    OR (blocker_id IS NULL AND blocker_guest_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "blocks_delete_own" ON public.blocks;
CREATE POLICY "blocks_delete_own" ON public.blocks
  FOR DELETE USING (
    blocker_id = auth.uid()
    OR (blocker_id IS NULL AND blocker_guest_id IS NOT NULL)
  );
