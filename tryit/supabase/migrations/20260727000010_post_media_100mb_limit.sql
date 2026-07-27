-- Fix: Video uploads fail with "exceeded maximum size" for 18s clips.
--
-- Root cause: the `post-media` storage bucket has the default 1MB / low
-- file_size_limit, so any video (and even large photos) get rejected by
-- Supabase Storage with a generic "exceeded maximum size" error before the
-- upload completes.
--
-- Fix: recreate the bucket's size policy to allow up to 100MB per object,
-- which comfortably covers short phone clips (18s @ low quality is a few MB).
-- `public` bucket so public read URLs work for the feed; RLS still governs
-- writes. Run with the service-role key (anon cannot admin buckets).

-- Update the existing bucket's per-object size limit to 100MB.
-- storage.buckets.file_size_limit is in bytes; 100 * 1024 * 1024 = 104857600.
update storage.buckets
   set file_size_limit = 104857600
 where id = 'post-media';

-- If the bucket somehow doesn't exist yet, create it with the 100MB limit.
insert into storage.buckets (id, name, public, file_size_limit)
values ('post-media', 'post-media', true, 104857600)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their own folder under post-media,
-- and allow public read. These policies are idempotent.
insert into storage.policies (name, bucket_id, policy_type, definition)
select 'post_media_owner_write', 'post-media', 'permissive',
       "auth"."uid"() = split_part((storage."objectname")(), '/', 1)
where not exists (
  select 1 from storage.policies
   where name = 'post_media_owner_write' and bucket_id = 'post-media'
);

insert into storage.policies (name, bucket_id, policy_type, definition)
select 'post_media_public_read', 'post-media', 'anonymous', true
where not exists (
  select 1 from storage.policies
   where name = 'post_media_public_read' and bucket_id = 'post-media'
);
