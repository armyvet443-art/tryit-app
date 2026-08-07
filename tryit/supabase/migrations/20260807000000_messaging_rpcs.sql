-- Messaging RPCs used by the app's chat feature.
-- The tables (conversations, conversation_participants, messages, etc.)
-- already exist in the database, but the RPC functions the client calls
-- were never created — causing every send/fetch to fail with "function
-- does not exist".
--
-- All functions use SECURITY DEFINER so RLS doesn't block the multi-table
-- joins and cross-user inserts. Each one validates auth.uid() up front.

-- Drop existing versions with incompatible signatures before recreating.
DROP FUNCTION IF EXISTS public.get_or_create_conversation(uuid);
DROP FUNCTION IF EXISTS public.send_message(uuid, text);
DROP FUNCTION IF EXISTS public.get_user_conversations();
DROP FUNCTION IF EXISTS public.get_conversation_messages(uuid, int);
DROP FUNCTION IF EXISTS public.mark_conversation_read(uuid);

-- ─── get_or_create_conversation ─────────────────────────────────────────────
-- Find an existing 1:1 direct conversation between the caller and another
-- user, or create one if none exists. Returns the conversation UUID.
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id uuid;
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF other_user_id IS NULL THEN
    RAISE EXCEPTION 'Missing other user';
  END IF;
  IF other_user_id = caller_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;

  -- Look for an existing direct conversation with both users as participants
  SELECT c.id INTO conv_id
  FROM conversations c
  WHERE c.conversation_type = 'direct'
    AND c.is_group = false
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp1
      WHERE cp1.conversation_id = c.id AND cp1.user_id = caller_id
    )
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = c.id AND cp2.user_id = other_user_id
    )
  LIMIT 1;

  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  -- Create the conversation + add both participants
  INSERT INTO conversations (conversation_type, is_group, created_by)
  VALUES ('direct', false, caller_id)
  RETURNING id INTO conv_id;

  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES (conv_id, caller_id, 'member'),
         (conv_id, other_user_id, 'member');

  RETURN conv_id;
END;
$$;

-- ─── send_message ───────────────────────────────────────────────────────────
-- Insert a text message into a conversation and update the conversation's
-- last-message metadata.
CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id uuid,
  p_content text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_content IS NULL OR btrim(p_content) = '' THEN
    RAISE EXCEPTION 'Message content cannot be empty';
  END IF;

  -- Verify the caller is a participant
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = caller_id
  ) THEN
    RAISE EXCEPTION 'Not a participant in this conversation';
  END IF;

  -- Insert the message (message_type defaults to 'text')
  INSERT INTO messages (conversation_id, sender_id, content)
  VALUES (p_conversation_id, caller_id, p_content);

  -- Update conversation metadata for the list view
  UPDATE conversations
  SET last_message_text = p_content,
      last_message_at   = now(),
      last_message_sender_id = caller_id,
      updated_at        = now()
  WHERE id = p_conversation_id;
END;
$$;

-- ─── get_user_conversations ─────────────────────────────────────────────────
-- Return all direct conversations for the caller, with the other user's
-- profile info, last message preview, and unread count.
CREATE OR REPLACE FUNCTION public.get_user_conversations()
RETURNS TABLE (
  conversation_id    uuid,
  other_user_id      uuid,
  other_username     text,
  other_display_name text,
  other_avatar_url   text,
  last_message_text  text,
  last_message_at    timestamptz,
  unread_count       bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    c.id                                    AS conversation_id,
    other_cp.user_id                        AS other_user_id,
    up.username                             AS other_username,
    up.display_name                         AS other_display_name,
    up.avatar_url                           AS other_avatar_url,
    c.last_message_text                     AS last_message_text,
    c.last_message_at                       AS last_message_at,
    (
      SELECT COUNT(*)::bigint
      FROM messages m
      WHERE m.conversation_id = c.id
        AND m.sender_id <> caller_id
        AND m.is_deleted = false
        AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
    )                                       AS unread_count
  FROM conversations c
  JOIN conversation_participants cp
    ON cp.conversation_id = c.id AND cp.user_id = caller_id
  JOIN conversation_participants other_cp
    ON other_cp.conversation_id = c.id AND other_cp.user_id <> caller_id
  LEFT JOIN user_profiles up
    ON up.id = other_cp.user_id
  WHERE c.conversation_type = 'direct'
  ORDER BY COALESCE(c.last_message_at, c.created_at) DESC;
END;
$$;

-- ─── get_conversation_messages ──────────────────────────────────────────────
-- Return messages for a conversation (oldest first), up to p_limit.
-- Verifies the caller is a participant before returning anything.
CREATE OR REPLACE FUNCTION public.get_conversation_messages(
  p_conversation_id uuid,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  id              uuid,
  conversation_id uuid,
  sender_id       uuid,
  content         text,
  message_type    message_type,
  media_url       text,
  created_at      timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = caller_id
  ) THEN
    RAISE EXCEPTION 'Not a participant in this conversation';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.message_type,
    m.media_url,
    m.created_at
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.is_deleted = false
  ORDER BY m.created_at ASC
  LIMIT GREATEST(1, p_limit);
END;
$$;

-- ─── mark_conversation_read ─────────────────────────────────────────────────
-- Set the caller's last_read_at to now() for a conversation, which clears
-- the unread badge.
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = caller_id;
END;
$$;
