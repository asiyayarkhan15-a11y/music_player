/**
 * Favorites and playlists, stored in Supabase.
 *
 * This is the file that used to be localStorage. Nothing outside it changed
 * when we swapped — which is exactly why every function was written `async`
 * from the start, even when saving was instant.
 *
 * ⚠️ Notice what is MISSING from every query below: there is no
 *    `.eq("user_id", currentUser.id)` anywhere.
 *
 * We never filter by user, and we never send a user id when inserting.
 * Postgres does both itself:
 *   - the RLS policies decide which rows you may see and change
 *   - `default auth.uid()` fills in the owner on insert
 *
 * So a bug in this file cannot leak another person's data. The database
 * would refuse. See supabase/schema.sql.
 */

import type { Track } from "@/lib/track";
import { getSupabase } from "@/lib/supabase";

export type Playlist = {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: string;
};

/** Postgres code for "unique constraint violated" — i.e. already saved. */
const ALREADY_EXISTS = "23505";

/* ---------------------------- favorites ---------------------------- */

export async function getFavorites(): Promise<Track[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("favorites")
    .select("track_data")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[saves] getFavorites", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.track_data as Track);
}

export async function addFavorite(track: Track): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from("favorites")
    .insert({ track_id: track.id, track_data: track });

  // Double-clicking the heart is not an error worth showing anyone.
  if (error && error.code !== ALREADY_EXISTS) {
    console.error("[saves] addFavorite", error.message);
    throw new Error(error.message);
  }
}

export async function removeFavorite(trackId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("track_id", trackId);

  if (error) {
    console.error("[saves] removeFavorite", error.message);
    throw new Error(error.message);
  }
}

/* ---------------------------- playlists ---------------------------- */

export async function getPlaylists(): Promise<Playlist[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  // One request, not one-per-playlist: Supabase can pull the child rows
  // through the foreign key in the same query.
  const { data, error } = await supabase
    .from("playlists")
    .select("id, name, created_at, playlist_tracks (track_data, position)")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[saves] getPlaylists", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const rows = (row.playlist_tracks ?? []) as {
      track_data: Track;
      position: number;
    }[];

    return {
      id: row.id as string,
      name: row.name as string,
      createdAt: row.created_at as string,
      tracks: [...rows]
        .sort((a, b) => a.position - b.position)
        .map((r) => r.track_data),
    };
  });
}

export async function createPlaylist(name: string): Promise<Playlist> {
  const supabase = getSupabase();
  const trimmed = name.trim() || "Untitled playlist";

  if (!supabase) {
    throw new Error("Not signed in.");
  }

  const { data, error } = await supabase
    .from("playlists")
    .insert({ name: trimmed })
    .select("id, name, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create playlist.");
  }

  return {
    id: data.id as string,
    name: data.name as string,
    createdAt: data.created_at as string,
    tracks: [],
  };
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  // The songs inside go too — `on delete cascade` in the schema handles it.
  const { error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", playlistId);

  if (error) throw new Error(error.message);
}

export async function addToPlaylist(
  playlistId: string,
  track: Track,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  // New songs go on the end, so ask how many are already there.
  const { count } = await supabase
    .from("playlist_tracks")
    .select("track_id", { count: "exact", head: true })
    .eq("playlist_id", playlistId);

  const { error } = await supabase.from("playlist_tracks").insert({
    playlist_id: playlistId,
    track_id: track.id,
    track_data: track,
    position: count ?? 0,
  });

  if (error && error.code !== ALREADY_EXISTS) {
    console.error("[saves] addToPlaylist", error.message);
    throw new Error(error.message);
  }
}

export async function removeFromPlaylist(
  playlistId: string,
  trackId: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from("playlist_tracks")
    .delete()
    .eq("playlist_id", playlistId)
    .eq("track_id", trackId);

  if (error) throw new Error(error.message);
}
