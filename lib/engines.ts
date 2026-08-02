"use client";

/**
 * Two ways to make sound, one set of buttons.
 *
 *   Audius  -> an <audio> element we control directly
 *   YouTube -> an <iframe> we send commands to
 *
 * Those have nothing in common technically, so each is wrapped in an
 * "engine" exposing the same seven methods. store/player.ts picks an engine
 * by `track.source` and never learns which kind it got.
 *
 * Engines report back through `engineEvents`. PlayerProvider points those
 * at the store on mount. Doing it this way — instead of importing the store
 * here — keeps the dependency one-directional and avoids a circular import.
 */

import { streamUrl } from "@/lib/audius";
import type { TrackSource } from "@/lib/track";

export type Engine = {
  load(sourceId: string, autoplay: boolean): void;
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  applyVolume(volume: number, muted: boolean): void;
  getTime(): number;
  getDuration(): number;
  stop(): void;
};

export const engineEvents = {
  onTime: (_current: number, _duration: number) => {},
  onEnded: () => {},
  onLoading: (_loading: boolean) => {},
  onError: () => {},
};

/**
 * Ears do not hear volume in a straight line. A slider at 50% sounds much
 * louder than "half" if passed through directly. Squaring it makes the
 * slider feel even along its whole length — and both engines use the same
 * curve, so switching sources does not change the perceived loudness.
 */
function gain(volume: number): number {
  return Math.max(0, Math.min(1, volume)) ** 2;
}

/* ================================================================== *
 * Audius — the plain <audio> element
 * ================================================================== */

let audioEl: HTMLAudioElement | null = null;

export function registerAudioElement(el: HTMLAudioElement | null) {
  audioEl = el;
}

const audiusEngine: Engine = {
  load(sourceId, autoplay) {
    if (!audioEl) return;
    audioEl.src = streamUrl(sourceId);
    audioEl.load();
    if (autoplay) audioEl.play().catch(() => engineEvents.onError());
  },
  play() {
    audioEl?.play().catch(() => engineEvents.onError());
  },
  pause() {
    audioEl?.pause();
  },
  seek(seconds) {
    if (audioEl) audioEl.currentTime = seconds;
  },
  applyVolume(volume, muted) {
    if (!audioEl) return;
    audioEl.volume = gain(volume);
    audioEl.muted = muted;
  },
  getTime: () => audioEl?.currentTime ?? 0,
  getDuration: () => audioEl?.duration || 0,
  stop() {
    audioEl?.pause();
  },
};

/* ================================================================== *
 * YouTube — the IFrame player
 * ================================================================== */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let mountEl: HTMLElement | null = null;
let ytPlayer: any = null;
let ytReady = false;
let apiPromise: Promise<void> | null = null;
let pending: { videoId: string; autoplay: boolean } | null = null;
let ticker: ReturnType<typeof setInterval> | null = null;
/** Remembered so a player created later still starts at the right volume. */
let lastVolume = { volume: 0.8, muted: false };

export function registerYouTubeMount(el: HTMLElement | null) {
  mountEl = el;
}

/** Load YouTube's script once, and resolve when it is ready to use. */
function loadIframeApi(): Promise<void> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }

    // YouTube calls this global function when its script finishes.
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });

  return apiPromise;
}

function startTicker() {
  stopTicker();
  // The iframe gives no "timeupdate" event, so we ask it where it is
  // four times a second — the same rate a real <audio> element reports.
  ticker = setInterval(() => {
    if (!ytPlayer?.getCurrentTime) return;
    engineEvents.onTime(
      ytPlayer.getCurrentTime() ?? 0,
      ytPlayer.getDuration() ?? 0,
    );
  }, 250);
}

function stopTicker() {
  if (ticker) clearInterval(ticker);
  ticker = null;
}

function createPlayer(videoId: string, autoplay: boolean) {
  if (!mountEl || !window.YT?.Player) return;

  ytPlayer = new window.YT.Player(mountEl, {
    videoId,
    playerVars: {
      autoplay: autoplay ? 1 : 0,
      controls: 0, // our own bar drives it
      disablekb: 1, // our keyboard shortcuts win
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
      origin: typeof window !== "undefined" ? window.location.origin : undefined,
    },
    events: {
      onReady: () => {
        ytReady = true;
        ytPlayer.setVolume(gain(lastVolume.volume) * 100);
        if (lastVolume.muted) ytPlayer.mute();
        if (pending) {
          youtubeEngine.load(pending.videoId, pending.autoplay);
          pending = null;
        }
      },
      onStateChange: (event: any) => {
        const state = event.data;
        // 0 ended · 1 playing · 2 paused · 3 buffering
        if (state === 1) {
          engineEvents.onLoading(false);
          startTicker();
        } else if (state === 3) {
          engineEvents.onLoading(true);
        } else if (state === 0) {
          stopTicker();
          engineEvents.onEnded();
        } else if (state === 2) {
          stopTicker();
        }
      },
      onError: () => {
        // 101 and 150 mean the owner disabled embedding. Nothing to do
        // but move on — the store skips to the next track.
        stopTicker();
        engineEvents.onLoading(false);
        engineEvents.onError();
      },
    },
  });
}

const youtubeEngine: Engine = {
  load(videoId, autoplay) {
    engineEvents.onLoading(true);

    loadIframeApi().then(() => {
      if (!ytPlayer) {
        createPlayer(videoId, autoplay);
        return;
      }
      if (!ytReady) {
        // Player exists but is still starting up — remember what to do.
        pending = { videoId, autoplay };
        return;
      }
      if (autoplay) ytPlayer.loadVideoById(videoId);
      else ytPlayer.cueVideoById(videoId);
    });
  },
  play() {
    ytPlayer?.playVideo?.();
  },
  pause() {
    ytPlayer?.pauseVideo?.();
  },
  seek(seconds) {
    ytPlayer?.seekTo?.(seconds, true);
  },
  applyVolume(volume, muted) {
    lastVolume = { volume, muted };
    if (!ytPlayer?.setVolume) return;
    ytPlayer.setVolume(gain(volume) * 100); // YouTube wants 0-100
    if (muted) ytPlayer.mute?.();
    else ytPlayer.unMute?.();
  },
  getTime: () => ytPlayer?.getCurrentTime?.() ?? 0,
  getDuration: () => ytPlayer?.getDuration?.() ?? 0,
  stop() {
    stopTicker();
    ytPlayer?.pauseVideo?.();
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ================================================================== */

export function getEngine(source: TrackSource): Engine {
  return source === "youtube" ? youtubeEngine : audiusEngine;
}

/** Silence whichever engine is NOT about to be used. */
export function stopOtherEngine(keep: TrackSource) {
  if (keep === "youtube") audiusEngine.stop();
  else youtubeEngine.stop();
}
