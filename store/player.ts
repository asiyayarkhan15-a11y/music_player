"use client";

import { create } from "zustand";
import type { Track } from "@/lib/audius";
import { streamUrl } from "@/lib/audius";

export type RepeatMode = "off" | "all" | "one";

/**
 * The <audio> element itself is NOT React state.
 *
 * React state is for things that change what you SEE. The audio element is
 * a machine we give orders to. Keeping it here (module scope) means the
 * store can call .play() directly, and React never re-renders because of it.
 * PlayerProvider registers it once when the app starts.
 */
let audio: HTMLAudioElement | null = null;

export function registerAudio(element: HTMLAudioElement | null) {
  audio = element;
}

export function getAudio() {
  return audio;
}

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

/**
 * Ears do not hear volume in a straight line. A slider at 50% sounds far
 * louder than "half" if you pass it through directly. Squaring it makes
 * the slider feel even along its whole length.
 */
function perceptual(v: number) {
  return Math.max(0, Math.min(1, v)) ** 2;
}

/** Load a track into the audio element and start it. */
function load(track: Track | undefined, play: boolean) {
  if (!audio || !track) return;
  audio.src = streamUrl(track.id);
  audio.load();
  if (play) {
    // Browsers reject play() until the user has interacted with the page.
    audio.play().catch(() => {
      usePlayer.setState({ isPlaying: false });
    });
  }
}

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  order: [],
  pos: 0,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: "off",

  playQueue: (tracks, startIndex) => {
    if (tracks.length === 0) return;
    const { shuffle } = get();
    const { order, pos } = buildOrder(tracks.length, shuffle, startIndex);

    set({ queue: tracks, order, pos, isPlaying: true, currentTime: 0 });
    load(tracks[order[pos]], true);
  },

  togglePlay: () => {
    const { isPlaying, queue } = get();
    if (!audio || queue.length === 0) return;

    if (isPlaying) {
      audio.pause();
      set({ isPlaying: false });
    } else {
      audio.play().catch(() => set({ isPlaying: false }));
      set({ isPlaying: true });
    }
  },

  next: (auto = false) => {
    const { order, pos, queue, repeat } = get();
    if (queue.length === 0) return;

    // Repeat-one only loops when a song ENDS. Pressing skip still skips —
    // otherwise the button would appear broken.
    if (auto && repeat === "one") {
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
      return;
    }

    const last = pos >= order.length - 1;

    if (last && repeat === "off") {
      if (auto) {
        audio?.pause();
        set({ isPlaying: false, currentTime: 0 });
        return;
      }
      return; // manual next at the end does nothing
    }

    const nextPos = last ? 0 : pos + 1;
    set({ pos: nextPos, currentTime: 0, isPlaying: true });
    load(queue[order[nextPos]], true);
  },

  previous: () => {
    const { order, pos, queue } = get();
    if (queue.length === 0 || !audio) return;

    // Standard music-player behaviour: if you are more than 3 seconds in,
    // "previous" restarts this song instead of leaving it.
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      set({ currentTime: 0 });
      return;
    }

    const prevPos = pos === 0 ? order.length - 1 : pos - 1;
    set({ pos: prevPos, currentTime: 0, isPlaying: true });
    load(queue[order[prevPos]], true);
  },

  seek: (seconds) => {
    if (!audio) return;
    audio.currentTime = seconds;
    set({ currentTime: seconds });
  },

  setVolume: (v) => {
    const clamped = Math.max(0, Math.min(1, v));
    if (audio) {
      audio.volume = perceptual(clamped);
      audio.muted = false;
    }
    set({ volume: clamped, muted: false });
  },

  toggleMute: () => {
    const next = !get().muted;
    if (audio) audio.muted = next;
    set({ muted: next });
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

  setTime: (currentTime, duration) => set({ currentTime, duration }),
  setLoading: (isLoading) => set({ isLoading }),
}));

/** The track playing right now, or null. */
export function useCurrentTrack(): Track | null {
  return usePlayer((s) => s.queue[s.order[s.pos]] ?? null);
}
