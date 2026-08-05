-- Add website and social links to user_profiles
-- Allows users to add a personal website and social media links to their profile

alter table public.user_profiles
  add column if not exists website text default '',
  add column if not exists instagram_url text default '',
  add column if not exists tiktok_url text default '',
  add column if not exists youtube_url text default '';
