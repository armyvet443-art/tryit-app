-- Push notification tokens for Expo notifications
-- Stores per-device push tokens so we can send push notifications
-- when users get reactions, comments, follows, etc.

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text default 'ios',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, token)
);

-- RLS: users can only manage their own push tokens
alter table public.push_tokens enable row level security;

create policy "Users can read own push tokens"
  on public.push_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert own push tokens"
  on public.push_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can update own push tokens"
  on public.push_tokens for update
  using (auth.uid() = user_id);

create policy "Users can delete own push tokens"
  on public.push_tokens for delete
  using (auth.uid() = user_id);

-- Allow service role (used by edge functions / server-side) full access
create policy "Service role full access to push tokens"
  on public.push_tokens for all
  using (auth.role() = 'service_role');

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger push_tokens_updated_at
  before update on public.push_tokens
  for each row execute function public.set_updated_at();
