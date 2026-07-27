-- Fix: Try Meter reactions not persisting (Must Try / Worth It / Maybe / Not For Me stay at 0)
--
-- Root cause: Two overloaded `upsert_reaction` functions exist with conflicting
-- `p_guest_id` types (uuid vs text). PostgREST returns PGRST203
-- "Could not choose the best candidate function" on every call, so no row is
-- ever written and the UI reverts counts to 0.
--
-- Fix: Drop BOTH overloads and recreate a single unambiguous function with
-- `p_guest_id TEXT` and `p_reaction_type TEXT` (matching the client param name).
-- The client (tryit/services/tryit-service.ts) already sends:
--   { p_post_id, p_reaction_type, p_user_id, p_guest_id (TEXT or null) }
--
-- Table is `reactions` (not post_reactions). Columns:
--   post_id uuid, user_id uuid, guest_id text, reaction_type text
-- Post count columns (must_try_count, etc.) are kept in sync by an existing
-- trigger, so once rows are written the feed counts persist automatically.

-- Drop both conflicting overloads. DROP FUNCTION with an explicit argument
-- type list targets that signature specifically; IF EXISTS makes retries safe.
DROP FUNCTION IF EXISTS public.upsert_reaction(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.upsert_reaction(uuid, text, text, text);
-- Also drop any signature variants that may exist with named-arg ordering, to
-- fully clear the schema cache before recreating.
DROP FUNCTION IF EXISTS public.upsert_reaction(p_post_id uuid, p_reaction text, p_user_id uuid, p_guest_id uuid);
DROP FUNCTION IF EXISTS public.upsert_reaction(p_post_id uuid, p_user_id uuid, p_reaction text, p_guest_id text);

-- Single unambiguous version. p_guest_id is always TEXT (e.g. "guest_xxx" or a
-- UUID string). Pass null for p_user_id in guest mode, null for p_guest_id when
-- logged in, so the (user_id = p_user_id OR guest_id = p_guest_id) clause only
-- matches the voter's own row.
CREATE OR REPLACE FUNCTION public.upsert_reaction(
  p_post_id uuid,
  p_user_id uuid,
  p_guest_id text,
  p_reaction_type text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove any existing reaction by this voter (user OR guest), so toggling
  -- between reaction types swaps rather than stacks.
  DELETE FROM public.reactions
   WHERE post_id = p_post_id
     AND ( (p_user_id IS NOT NULL AND user_id = p_user_id)
        OR (p_guest_id IS NOT NULL AND guest_id = p_guest_id) );

  -- Insert the new reaction (if any). null p_reaction_type is treated as a
  -- pure delete (used by the toggle-off path; the client calls delete_reaction
  -- there instead, but this keeps the function safe either way).
  IF p_reaction_type IS NOT NULL THEN
    INSERT INTO public.reactions (post_id, user_id, guest_id, reaction_type)
    VALUES (p_post_id, p_user_id, p_guest_id, p_reaction_type);
  END IF;
END;
$$;

-- Tell PostgREST to refresh its schema cache so the new signature is picked up
-- immediately (otherwise the first call after deploy can still hit the old cache).
NOTIFY pgrst, 'reload schema';
