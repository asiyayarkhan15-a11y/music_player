-- ===================================================================
--  Music Player — database schema
--
--  Paste this whole file into Supabase -> SQL Editor -> Run.
--  Safe to run more than once.
-- ===================================================================


-- -------------------------------------------------------------------
--  Tables
-- -------------------------------------------------------------------

-- One row = one person liked one song.
create table if not exists public.favorites (
  -- `default auth.uid()` is the neat part: Postgres fills in WHO you are
  -- from your login token, so the app never sends a user id at all.
  -- Nobody can write a row belonging to someone else, even by accident.
  user_id    uuid not null default auth.uid()
             references auth.users on delete cascade,
  track_id   text not null,

  -- A COPY of the track (title, artist, artwork, duration).
  -- Denormalised on purpose: without it, opening a 50-track playlist
  -- would mean 50 requests back to Audius or YouTube.
  track_data jsonb not null,

  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

-- One row = one playlist.
create table if not exists public.playlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid()
             references auth.users on delete cascade,
  name       text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now()
);

-- One row = one song inside one playlist.
create table if not exists public.playlist_tracks (
  playlist_id uuid not null references public.playlists on delete cascade,
  track_id    text not null,
  track_data  jsonb not null,
  position    integer not null default 0,
  added_at    timestamptz not null default now(),
  primary key (playlist_id, track_id)
);


-- -------------------------------------------------------------------
--  Indexes — make the common reads fast
-- -------------------------------------------------------------------

create index if not exists favorites_user_created_idx
  on public.favorites (user_id, created_at desc);

create index if not exists playlists_user_created_idx
  on public.playlists (user_id, created_at);

create index if not exists playlist_tracks_order_idx
  on public.playlist_tracks (playlist_id, position);


-- -------------------------------------------------------------------
--  Row Level Security
--
--  ⚠️ THIS IS THE WHOLE SECURITY MODEL.
--
--  The anon key in the browser is public by design. It grants NO access
--  on its own — these policies decide everything. A table without RLS
--  enabled is readable and writable by anyone who views your page source.
-- -------------------------------------------------------------------

alter table public.favorites       enable row level security;
alter table public.playlists       enable row level security;
alter table public.playlist_tracks enable row level security;


-- `auth.uid()` is "the id of whoever is asking right now", read from the
-- login token INSIDE the database. The app never has to check ownership.
--
--   using      -> which existing rows may I see / change / delete?
--   with check -> is the row I am ADDING allowed?
--
-- You need both. With only `using`, someone could insert a row carrying
-- another person's user_id.

drop policy if exists "own favorites" on public.favorites;
create policy "own favorites" on public.favorites
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own playlists" on public.playlists;
create policy "own playlists" on public.playlists
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- playlist_tracks has no user_id of its own — ownership is indirect,
-- through the playlist. So the policy asks a question instead:
-- "is this song inside a playlist that belongs to me?"
drop policy if exists "own playlist tracks" on public.playlist_tracks;
create policy "own playlist tracks" on public.playlist_tracks
  for all
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  );
