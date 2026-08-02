"use client";

import { useEffect, useRef } from "react";
import { usePlayer, useCurrentTrack } from "@/store/player";
import {
  engineEvents,
  registerAudioElement,
  registerYouTubeMount,
} from "@/lib/engines";

/**
 * Owns both players for the whole app.
 *
 * Mounted in app/layout.tsx, which React never unmounts. That matters: if
 * either player lived inside a page or a list item, React would destroy and
 * recreate it on re-render and the music would stop dead. This is the most
 * common bug in React music players.
 */
export default function PlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoWrapRef = useRef<HTMLDivElement | null>(null);

  const track = useCurrentTrack();
  const showVideo = track?.source === "youtube";

  const setTime = usePlayer((s) => s.setTime);
  const setLoading = usePlayer((s) => s.setLoading);
  const handleEnded = usePlayer((s) => s.handleEnded);
  const handleError = usePlayer((s) => s.handleError);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const previous = usePlayer((s) => s.previous);
  const seek = usePlayer((s) => s.seek);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);

  /* Hand the <audio> element to the engine layer. */
  useEffect(() => {
    registerAudioElement(audioRef.current);
    return () => registerAudioElement(null);
  }, []);

  /*
   * Give YouTube its own DOM node, created outside React.
   *
   * The IFrame API REPLACES the element you hand it with an <iframe>. If
   * that element were rendered by React, React would later try to remove a
   * child that no longer exists and throw. Creating it manually keeps the
   * node invisible to React's reconciler.
   */
  useEffect(() => {
    const wrapper = videoWrapRef.current;
    if (!wrapper) return;

    const host = document.createElement("div");
    host.style.width = "100%";
    host.style.height = "100%";
    wrapper.appendChild(host);
    registerYouTubeMount(host);

    return () => {
      registerYouTubeMount(null);
      host.remove();
    };
  }, []);

  /* Point the engines' callbacks at the store. */
  useEffect(() => {
    engineEvents.onTime = setTime;
    engineEvents.onEnded = handleEnded;
    engineEvents.onLoading = setLoading;
    engineEvents.onError = handleError;
  }, [setTime, handleEnded, setLoading, handleError]);

  /* Keyboard shortcuts. */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Never hijack keys while the user is typing in the search box.
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      ) {
        return;
      }

      const { currentTime, duration } = usePlayer.getState();

      switch (e.key) {
        case " ":
          e.preventDefault(); // stop the page scrolling
          togglePlay();
          break;
        case "ArrowRight":
          seek(Math.min(duration || 0, currentTime + 5));
          break;
        case "ArrowLeft":
          seek(Math.max(0, currentTime - 5));
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(usePlayer.getState().volume + 0.05);
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(usePlayer.getState().volume - 0.05);
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        case "n":
        case "N":
          next();
          break;
        case "p":
        case "P":
          previous();
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePlay, seek, setVolume, toggleMute, next, previous]);

  /*
   * Media Session API — makes hardware play/pause keys, headphone buttons
   * and the phone lock screen control our player. Works for both sources,
   * because it drives our store rather than either player directly.
   */
  useEffect(() => {
    if (!("mediaSession" in navigator) || !track) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      artwork: track.artwork
        ? [{ src: track.artwork, sizes: "480x480", type: "image/jpeg" }]
        : [],
    });

    navigator.mediaSession.setActionHandler("play", () => togglePlay());
    navigator.mediaSession.setActionHandler("pause", () => togglePlay());
    navigator.mediaSession.setActionHandler("nexttrack", () => next());
    navigator.mediaSession.setActionHandler("previoustrack", () => previous());
  }, [track, togglePlay, next, previous]);

  return (
    <>
      {children}

      {/* Audius playback. */}
      <audio
        ref={audioRef}
        preload="metadata"
        // crossOrigin is deliberately NOT set: Audius redirects the stream
        // to content nodes that do not send CORS headers, and requesting
        // CORS would make playback fail.
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setTime(el.currentTime, el.duration || 0);
        }}
        onLoadedMetadata={(e) => setTime(0, e.currentTarget.duration || 0)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        onCanPlay={() => setLoading(false)}
        onEnded={handleEnded}
        onError={handleError}
      />

      {/*
        YouTube playback.

        This panel must stay visible while a YouTube track plays — YouTube's
        terms require the player on screen at a minimum of 200x200 and forbid
        audio-only use. It is hidden only when an Audius track is playing,
        when nothing is running through it.
      */}
      <div
        className={
          showVideo
            ? "fixed bottom-28 right-3 z-40 w-64 overflow-hidden rounded-xl border border-line bg-black shadow-2xl sm:w-80 md:bottom-24"
            : "pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0"
        }
        aria-hidden={!showVideo}
      >
        <div ref={videoWrapRef} className="aspect-video w-full" />
      </div>
    </>
  );
}
