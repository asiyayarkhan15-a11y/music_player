"use client";

import { create } from "zustand";
import type { Track } from "@/lib/track";
import { getEngine, stopOtherEngine } from "@/lib/engines";

export type RepeatMode = "off" | "all" | "one";

type PlayerState = {
  /** The tracks loaded into the player. */
  queue: Track[];
  /**
   * Play order as positions into `queue`.
   * Shuffle OFF -> [0,1,2,3...]   Shuffle ON -> [2,0,3,1...]
   */
  order: number[];
  /** Where we are inside `order` (NOT inside `queue`). */
  pos: number;

  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  /** Set when a track refuses to play, so the UI can say something. */
  lastError: string | null;

  volume: number; // 0..1, what the slider shows
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;

  playQueue: (tracks: Track[], startIndex: number) => void;
  togglePlay: () => void;
  next: (auto?: boolean) => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  handleEnded: () => void;
  handleError: () => void;
  setTime: (current: number, duration: number) => void;
  setLoading: (loading: boolean) => void;
};

/**
 * Build the play order.
 *
 * Shuffle is a PRE-SHUFFLED LIST, not a random pick on every skip.
 * Random-on-skip would replay songs you just heard and makes "previous"
 * impossible. The track you clicked always goes first.
 */
function buildOrder(length: number, shuffle: boolean, startIndex: number) {
  const all = Array.from({ length }, (_, i) => i);
  if (!shuffle) return { order: all, pos: startIndex };

  const rest = all.filter((i) => i !== startIndex);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return { order: [startIndex, ...rest], pos: 0 };
}

/** Hand a track to the right engine, and silence the other one. */
function load(track: Track | undefined, autoplay: boolean) {
  if (!track) return;
  stopOtherEngine(track.source);
  const engine = getEngine(track.source);
  engine.applyVolume(usePlayer.getState().volume, usePlayer.getState().muted);
  engine.load(track.sourceId, autoplay);
}

function currentEngine() {
  const s = usePlayer.getState();
  const track = s.queue[s.order[s.pos]];
  return track ? getEngine(track.source) : null;
}

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  order: [],
  pos: 0,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  lastError: null,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: "off",

  playQueue: (tracks, startIndex) => {
    if (tracks.length === 0) return;
    const { shuffle } = get();
    const { order, pos } = buildOrder(tracks.length, shuffle, startIndex);

    set({
      queue: tracks,
      order,
      pos,
      isPlaying: true,
      currentTime: 0,
      duration: tracks[order[pos]]?.duration ?? 0,
      lastError: null,
    });
    load(tracks[order[pos]], true);
  },

  togglePlay: () => {
    const { isPlaying, queue } = get();
    const engine = currentEngine();
    if (!engine || queue.length === 0) return;

    if (isPlaying) {
      engine.pause();
      set({ isPlaying: false });
    } else {
      engine.play();
      set({ isPlaying: true });
    }
  },

  next: (auto = false) => {
    const { order, pos, queue, repeat } = get();
    if (queue.length === 0) return;

    // Repeat-one only loops when a song ENDS. Pressing skip still skips —
    // otherwise the button would appear broken.
    if (auto && repeat === "one") {
      const engine = currentEngine();
      engine?.seek(0);
      engine?.play();
      return;
    }

    const last = pos >= order.length - 1;

    if (last && repeat === "off") {
      if (auto) {
        currentEngine()?.pause();
        set({ isPlaying: false, currentTime: 0 });
      }
      return;
    }

    const nextPos = last ? 0 : pos + 1;
    const track = queue[order[nextPos]];
    set({
      pos: nextPos,
      currentTime: 0,
      duration: track?.duration ?? 0,
      isPlaying: true,
      lastError: null,
    });
    load(track, true);
  },

  previous: () => {
    const { order, pos, queue } = get();
    const engine = currentEngine();
    if (queue.length === 0 || !engine) return;

    // Standard music-player behaviour: if you are more than 3 seconds in,
    // "previous" restarts this song instead of leaving it.
    if (engine.getTime() > 3) {
      engine.seek(0);
      set({ currentTime: 0 });
      return;
    }

    const prevPos = pos === 0 ? order.length - 1 : pos - 1;
    const track = queue[order[prevPos]];
    set({
      pos: prevPos,
      currentTime: 0,
      duration: track?.duration ?? 0,
      isPlaying: true,
      lastError: null,
    });
    load(track, true);
  },

  seek: (seconds) => {
    currentEngine()?.seek(seconds);
    set({ currentTime: seconds });
  },

  setVolume: (v) => {
    const volume = Math.max(0, Math.min(1, v));
    // Applied to BOTH engines so the level does not jump when the next
    // track comes from the other source.
    getEngine("audius").applyVolume(volume, false);
    getEngine("youtube").applyVolume(volume, false);
    set({ volume, muted: false });
  },

  toggleMute: () => {
    const muted = !get().muted;
    const { volume } = get();
    getEngine("audius").applyVolume(volume, muted);
    getEngine("youtube").applyVolume(volume, muted);
    set({ muted });
  },

  toggleShuffle: () => {
    const { shuffle, order, pos, queue } = get();
    const nowShuffling = !shuffle;
    if (queue.length === 0) {
      set({ shuffle: nowShuffling });
      return;
    }

    // Keep playing the current song — only the songs AFTER it get reordered.
    const currentTrackIndex = order[pos];
    const rebuilt = buildOrder(queue.length, nowShuffling, currentTrackIndex);
    set({
      shuffle: nowShuffling,
      order: rebuilt.order,
      pos: nowShuffling ? 0 : currentTrackIndex,
    });
  },

  cycleRepeat: () => {
    const modes: RepeatMode[] = ["off", "all", "one"];
    const current = modes.indexOf(get().repeat);
    set({ repeat: modes[(current + 1) % modes.length] });
  },

  handleEnded: () => get().next(true),

  /**
   * A track refused to play — a deleted Audius upload, or a YouTube video
   * whose owner blocked embedding after we listed it. Skip on rather than
   * leave the user staring at a stuck player.
   */
  handleError: () => {
    const { order, pos, queue } = get();
    const failed = queue[order[pos]];
    const more = pos < order.length - 1;

    set({
      isLoading: false,
      lastError: failed
        ? `Could not play “${failed.title}”${more ? " — skipping." : "."}`
        : "Could not play that track.",
    });

    if (more) get().next(true);
    else set({ isPlaying: false });
  },

  setTime: (currentTime, duration) =>
    set((s) => ({ currentTime, duration: duration || s.duration })),
  setLoading: (isLoading) => set({ isLoading }),
}));

/** The track playing right now, or null. */
export function useCurrentTrack(): Track | null {
  return usePlayer((s) => s.queue[s.order[s.pos]] ?? null);
}
