/**
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  THIS IS THE FILE YOU REPLACE TOMORROW.                          │
 * │                                                                  │
 * │  Right now favorites and playlists are stored in localStorage    │
 * │  (this browser only, no login). To move to Supabase you rewrite  │
 * │  the bodies of the functions below and change nothing else in    │
 * │  the app.                                                        │
 * │                                                                  │
 * │  That is why every function is `async` even though localStorage  │
 * │  is instant — the signatures already match what Supabase needs,  │
 * │  so the swap does not ripple outwards.                           │
 * │                                                                  │
 * │  Example of tomorrow's version:                                  │
 * │                                                                  │
 * │    export async function getFavorites(): Promise<Track[]> {      │
 * │      const { data } = await supabase                             │
 * │        .from("favorites")                                        │
 * │        .select("track_data")                                     │
 * │        .order("created_at", { ascending: false });               │
 * │      return data?.map(r => r.track_data) ?? [];                  │
 * │    }                                                             │
 * │                                                                  │
 * │  Note you never filter by user id — the RLS policy in Postgres   │
 * │  already does that for you.                                      │
 * └──────────────────────────────────────────────────────────────────┘
 */

import type { Track } from "@/lib/track";

export type Playlist = {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: string;
};

const FAVORITES_KEY = "mp.favorites";
const PLAYLISTS_KEY = "mp.playlists";

/** localStorage does not exist while Next.js renders on the server. */
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode). Saving silently fails
    // rather than crashing the player.
  }
}

/* ---------------------------- favorites ---------------------------- */

export async function getFavorites(): Promise<Track[]> {
  return read<Track[]>(FAVORITES_KEY, []);
}

export async function addFavorite(track: Track): Promise<void> {
  const current = await getFavorites();
  if (current.some((t) => t.id === track.id)) return;
  write(FAVORITES_KEY, [track, ...current]);
}

export async function removeFavorite(trackId: string): Promise<void> {
  const current = await getFavorites();
  write(
    FAVORITES_KEY,
    current.filter((t) => t.id !== trackId),
  );
}

/* ---------------------------- playlists ---------------------------- */

export async function getPlaylists(): Promise<Playlist[]> {
  return read<Playlist[]>(PLAYLISTS_KEY, []);
}

export async function createPlaylist(name: string): Promise<Playlist> {
  const playlist: Playlist = {
    id: crypto.randomUUID(),
    name: name.trim() || "Untitled playlist",
    tracks: [],
    createdAt: new Date().toISOString(),
  };
  const current = await getPlaylists();
  write(PLAYLISTS_KEY, [...current, playlist]);
  return playlist;
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const current = await getPlaylists();
  write(
    PLAYLISTS_KEY,
    current.filter((p) => p.id !== playlistId),
  );
}

export async function addToPlaylist(
  playlistId: string,
  track: Track,
): Promise<void> {
  const current = await getPlaylists();
  write(
    PLAYLISTS_KEY,
    current.map((p) =>
      p.id === playlistId && !p.tracks.some((t) => t.id === track.id)
        ? { ...p, tracks: [...p.tracks, track] }
        : p,
    ),
  );
}

export async function removeFromPlaylist(
  playlistId: string,
  trackId: string,
): Promise<void> {
  const current = await getPlaylists();
  write(
    PLAYLISTS_KEY,
    current.map((p) =>
      p.id === playlistId
        ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) }
        : p,
    ),
  );
}
