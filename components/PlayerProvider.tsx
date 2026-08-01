"use client";

import { useEffect, useRef } from "react";
import { registerAudio, usePlayer, useCurrentTrack } from "@/store/player";

/**
 * There is exactly ONE <audio> element in this whole app, and it lives here.
 *
 * This component is mounted in app/layout.tsx, which React never unmounts.
 * That matters: if the audio element were inside a page or a list item,
 * React would destroy and recreate it on re-render and the music would
 * stop dead. This is the most common bug in React music players.
 */
export default function PlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const track = useCurrentTrack();

  const setTime = usePlayer((s) => s.setTime);
  const setLoading = usePlayer((s) => s.setLoading);
  const handleEnded = usePlayer((s) => s.handleEnded);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const previous = usePlayer((s) => s.previous);
  const seek = usePlayer((s) => s.seek);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);

  /* Hand the element to the store, and apply the starting volume. */
  useEffect(() => {
    const el = audioRef.current;
    registerAudio(el);
    if (el) el.volume = usePlayer.getState().volume ** 2;
    return () => registerAudio(null);
  }, []);

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

      const audio = audioRef.current;

      switch (e.key) {
        case " ":
          e.preventDefault(); // stop the page scrolling
          togglePlay();
          break;
        case "ArrowRight":
          if (audio) seek(Math.min(audio.duration || 0, audio.currentTime + 5));
          break;
        case "ArrowLeft":
          if (audio) seek(Math.max(0, audio.currentTime - 5));
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
   * Media Session API — makes the hardware play/pause keys on a keyboard,
   * headphones, and the phone lock screen control our player.
   * Roughly ten lines for a feature people assume is very hard.
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
        onError={() => {
          setLoading(false);
          usePlayer.setState({ isPlaying: false });
        }}
      />
    </>
  );
}
