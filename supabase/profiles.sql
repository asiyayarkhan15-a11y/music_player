-- ===================================================================
--  Music Player — user profiles and avatar storage
--
--  Run this AFTER schema.sql.
--  Paste into Supabase -> SQL Editor -> New snippet -> Run.
--  Safe to run more than once.
-- ===================================================================


-- -------------------------------------------------------------------
--  1. The profiles table
--
--  Supabase already stores the email and password in `auth.users`,
--  which we are not allowed to add columns to. Anything extra of our
--  own — display name, picture — lives here instead, keyed by the
--  same id.
-- -------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 60),
  avatar_url   text,
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- This app has no social features, so a profile is private to its owner.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);


-- -------------------------------------------------------------------
--  2. Create a profile automatically for every new account
--
--  A trigger is better than doing this from the app: it cannot be
--  skipped, and it runs the moment the account exists — however the
--  person signed up.
--
--  `security definer` lets the function write to a table the brand-new
--  user has no session for yet. `set search_path = ''` is the safety
--  pin that goes with it, forcing fully-qualified table names so the
--  function cannot be tricked into touching something else.
-- -------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    -- Google gives us a real name. Email signup does not, so fall back
    -- to the part before the @.
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- Anyone who signed up before this file was run has no profile row yet.
insert into public.profiles (id, display_name, avatar_url)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;


-- -------------------------------------------------------------------
--  3. Somewhere to keep the pictures
--
--  Supabase Storage is a file store with the same RLS rules as tables.
--  `public = true` means the IMAGES can be read by URL — necessary,
--  because the browser loads them in an <img> tag with no login token.
--  Writing is still locked down by the policies below.
-- -------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;


-- Files are stored as  <user-id>/avatar.jpg
-- so `(storage.foldername(name))[1]` is the owner's id.
-- That single expression is what stops one person overwriting
-- another person's picture.

drop policy if exists "avatars are publicly readable" on storage.objects;
create policy "avatars are publicly readable" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "users upload own avatar" on storage.objects;
create policy "users upload own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users replace own avatar" on storage.objects;
create policy "users replace own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete own avatar" on storage.objects;
create policy "users delete own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
