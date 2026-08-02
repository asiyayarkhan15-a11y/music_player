"use client";

import { create } from "zustand";
import type { Track } from "@/lib/track";
import type { Playlist } from "@/lib/saves";
import * as saves from "@/lib/saves";
import { useAuth, requireSignIn } from "@/store/auth";

/**
 * Favorites and playlists, held in memory so the UI feels instant.
 *
 * Every change is applied to the screen first and sent to Supabase second.
 * If the write fails we reload from the database, so the screen can never
 * drift away from what is actually stored.
 */
type LibraryState = {
  favorites: Track[];
  playlists: Playlist[];
  loaded: boolean;
  error: string | null;

  load: () => Promise<void>;
  clear: () => void;
  isFavorite: (trackId: string) => boolean;
  toggleFavorite: (track: Track) => Promise<void>;
  createPlaylist: (name: string) => Promise<Playlist | null>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  addToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
};

export const useLibrary = create<LibraryState>((set, get) => ({
  favorites: [],
  playlists: [],
  loaded: false,
  error: null,

  load: async () => {
    // Signed out means nothing to load — and nothing to show.
    if (!useAuth.getState().user) {
      set({ favorites: [], playlists: [], loaded: true });
      return;
    }

    const [favorites, playlists] = await Promise.all([
      saves.getFavorites(),
      saves.getPlaylists(),
    ]);
    set({ favorites, playlists, loaded: true, error: null });
  },

  clear: () => set({ favorites: [], playlists: [], loaded: true }),

  isFavorite: (trackId) => get().favorites.some((t) => t.id === trackId),

  toggleFavorite: async (track) => {
    if (requireSignIn()) return; // opens the sign-in dialog instead

    const already = get().isFavorite(track.id);

    // Fill the heart immediately rather than waiting for the round-trip.
    set((s) => ({
      favorites: already
        ? s.favorites.filter((t) => t.id !== track.id)
        : [track, ...s.favorites],
    }));

    try {
      if (already) await saves.removeFavorite(track.id);
      else await saves.addFavorite(track);
    } catch {
      set({ error: "Could not save. Please try again." });
      await get().load(); // put the screen back in step with the database
    }
  },

  createPlaylist: async (name) => {
    if (requireSignIn()) return null;

    try {
      const playlist = await saves.createPlaylist(name);
      set((s) => ({ playlists: [...s.playlists, playlist] }));
      return playlist;
    } catch {
      set({ error: "Could not create the playlist." });
      return null;
    }
  },

  deletePlaylist: async (playlistId) => {
    if (requireSignIn()) return;

    set((s) => ({ playlists: s.playlists.filter((p) => p.id !== playlistId) }));

    try {
      await saves.deletePlaylist(playlistId);
    } catch {
      set({ error: "Could not delete the playlist." });
      await get().load();
    }
  },

  addToPlaylist: async (playlistId, track) => {
    if (requireSignIn()) return;

    set((s) => ({
      playlists: s.playlists.map((p) =>
        p.id === playlistId && !p.tracks.some((t) => t.id === track.id)
          ? { ...p, tracks: [...p.tracks, track] }
          : p,
      ),
    }));

    try {
      await saves.addToPlaylist(playlistId, track);
    } catch {
      set({ error: "Could not add to the playlist." });
      await get().load();
    }
  },

  removeFromPlaylist: async (playlistId, trackId) => {
    if (requireSignIn()) return;

    set((s) => ({
      playlists: s.playlists.map((p) =>
        p.id === playlistId
          ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) }
          : p,
      ),
    }));

    try {
      await saves.removeFromPlaylist(playlistId, trackId);
    } catch {
      set({ error: "Could not remove from the playlist." });
      await get().load();
    }
  },
}));
