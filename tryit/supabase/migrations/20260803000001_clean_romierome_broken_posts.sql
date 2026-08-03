-- Clean up the broken/black video posts left on @romierome's profile.
--
-- These are the posts that appear as black squares in the profile grid and/or
-- uploaded empty 0-byte video files during Build 10 testing. Deleting them
-- gives a clean profile for the next TestFlight build.
--
-- Affected posts: all media_type = 'video' posts by user_id 3fca2f93-531f-4873-93ab-264e61780277
-- (the old no-thumbnail black-grid videos plus the latest empty-file upload).

with broken_posts as (
  select id from posts
  where user_id = '3fca2f93-531f-4873-93ab-264e61780277'
    and media_type = 'video'
)
delete from reactions where post_id in (select id from broken_posts);

with broken_posts as (
  select id from posts
  where user_id = '3fca2f93-531f-4873-93ab-264e61780277'
    and media_type = 'video'
)
delete from post_likes where post_id in (select id from broken_posts);

with broken_posts as (
  select id from posts
  where user_id = '3fca2f93-531f-4873-93ab-264e61780277'
    and media_type = 'video'
)
delete from comments where post_id in (select id from broken_posts);

with broken_posts as (
  select id from posts
  where user_id = '3fca2f93-531f-4873-93ab-264e61780277'
    and media_type = 'video'
)
delete from saved_posts where post_id in (select id from broken_posts);

with broken_posts as (
  select id from posts
  where user_id = '3fca2f93-531f-4873-93ab-264e61780277'
    and media_type = 'video'
)
delete from tried_this where post_id in (select id from broken_posts);

delete from posts
where user_id = '3fca2f93-531f-4873-93ab-264e61780277'
  and media_type = 'video';
