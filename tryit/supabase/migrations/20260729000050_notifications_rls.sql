-- ─── Notifications table ───────────────────────────────────────────────────
-- Stores notifications for: comments, follows, tried, fire reactions.
-- Ensures RLS allows the recipient to read/delete their own notifications,
-- and allows anyone to INSERT (since triggers or the app create them).

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,                     -- recipient
  actor_id    uuid,                              -- who performed the action (nullable for system)
  actor_guest_id text,                           -- guest actor if applicable
  post_id     uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  notification_type text NOT NULL DEFAULT 'generic', -- comment, follow, tried, fire
  message     text NOT NULL DEFAULT '',
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications (user_id) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: recipient can read their own notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- INSERT: allow all (app inserts on behalf of actors; triggers may also insert)
DROP POLICY IF EXISTS "notifications_insert_all" ON public.notifications;
CREATE POLICY "notifications_insert_all" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- UPDATE: recipient can mark their own as read
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- DELETE: recipient can delete their own notifications
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());
