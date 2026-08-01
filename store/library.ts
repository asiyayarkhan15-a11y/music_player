"use client";

import { create } from "zustand";
import type { Track } from "@/lib/audius";
import type { Playlist } from "@/lib/saves";
import * as saves from "@/lib/saves";

/**
 * Favorites and playlists, held in memory so the UI is instant.
 *
 * Every change writes through to lib/saves.ts. When that file becomes
 * Supabase-backed tomorrow, this store does not change at all.
 */
type LibraryState = {
  favorites: Track[];
  playlists: Playlist[];
  loaded: boolean;

  load: () => Promise<void>;
  isFavorite: (trackId: string) => boolean;
  toggleFavorite: (track: Track) => Promise<void>;
  createPlaylist: (name: string) => Promise<Playlist>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  addToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
};

export const useLibrary = create<LibraryState>((set, get) => ({
  favorites: [],
  playlists: [],
  loaded: false,

  load: async () => {
    const [favorites, playlists] = await Promise.all([
      saves.getFavorites(),
      saves.getPlaylists(),
    ]);
    set({ favorites, playlists, loaded: true });
  },

  isFavorite: (trackId) => get().favorites.some((t) => t.id === trackId),

  toggleFavorite: async (track) => {
    const already = get().isFavorite(track.id);

    // Update the screen first, then storage. The heart fills instantly
    // instead of waiting — this matters more once Supabase is involved
    // and the write takes a real network round-trip.
    set((s) => ({
      favorites: already
        ? s.favorites.filter((t) => t.id !== track.id)
        : [track, ...s.favorites],
    }));

    if (already) await saves.removeFavorite(track.id);
    else await saves.addFavorite(track);
  },

  createPlaylist: async (name) => {
    const playlist = await saves.createPlaylist(name);
    set((s) => ({ playlists: [...s.playlists, playlist] }));
    return playlist;
  },

  deletePlaylist: async (playlistId) => {
    set((s) => ({ playlists: s.playlists.filter((p) => p.id !== playlistId) }));
    await saves.deletePlaylist(playlistId);
  },

  addToPlaylist: async (playlistId, track) => {
    set((s) => ({
      playlists: s.playlists.map((p) =>
        p.id === playlistId && !p.tracks.some((t) => t.id === track.id)
          ? { ...p, tracks: [...p.tracks, track] }
          : p,
      ),
    }));
    await saves.addToPlaylist(playlistId, track);
  },

  removeFromPlaylist: async (playlistId, trackId) => {
    set((s) => ({
      playlists: s.playlists.map((p) =>
        p.id === playlistId
          ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) }
          : p,
      ),
    }));
    await saves.removeFromPlaylist(playlistId, trackId);
  },
}));
