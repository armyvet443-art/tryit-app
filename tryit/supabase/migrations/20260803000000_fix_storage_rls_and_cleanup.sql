-- Fix: Storage RLS policies for post-media bucket + cleanup of broken posts.
--
-- Root cause of black thumbnails / crashes:
--   1. The existing write policy used storage.objectname() which can return
--      unexpected formats on some Supabase versions, causing uploads to
--      silently fail or create objects with wrong paths — resulting in
--      posts with null/invalid media_urls.
--   2. No DELETE policy existed, so orphaned files from failed post creation
--      could never be cleaned up.
--   3. Posts created with null/empty media_urls render as black squares and
--      can crash the app when it tries to load a null image source.
--
-- This migration (applied live 2026-08-03):
--   A) Replaces the write policy with storage.foldername(name) (the documented API)
--   B) Adds a DELETE policy so users can remove their own media
--   C) Ensures public read is in place
--   D) Deletes existing broken posts (null/empty media_urls) — run separately

-- A) Replace write policy with storage.foldername(name) (the documented API)
drop policy if exists "post_media_owner_write" on storage.objects;

create policy "post_media_owner_write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- B) Allow users to delete their own uploaded media (orphan cleanup)
drop policy if exists "post_media_owner_delete" on storage.objects;

create policy "post_media_owner_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- C) Ensure public read is in place (idempotent)
drop policy if exists "post_media_public_read" on storage.objects;

create policy "post_media_public_read"
  on storage.objects for select to public
  using (bucket_id = 'post-media');

-- D) Delete existing posts that have no valid media_urls.
--    These are the posts causing black squares and crashes.
--    Run this AFTER the fix is live so no new broken posts can be created.
--    (Applied as a separate runMigration call to confirm the DELETE count.)
delete from posts
 where media_url is null
    or media_url = ''
    or media_url = '[]'
    or media_url = 'null';
