-- Bump post-media bucket file_size_limit to 200MB.
--
-- The previous migration set it to 100MB, but Supabase Storage was still
-- rejecting videos around 50-60MB with "object exceeded maximum allowed size".
-- This may be because:
--   1. The previous migration was not applied, OR
--   2. The bucket-level limit was overridden by a project-level setting.
--
-- Run this in the Supabase Dashboard → SQL Editor with the service role.
-- 200 * 1024 * 1024 = 209715200 bytes.
update storage.buckets
   set file_size_limit = 209715200
 where id = 'post-media';

-- Safety: create the bucket if it doesn't exist.
insert into storage.buckets (id, name, public, file_size_limit)
values ('post-media', 'post-media', true, 209715200)
on conflict (id) do nothing;
