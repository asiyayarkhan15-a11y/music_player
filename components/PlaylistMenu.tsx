"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Track } from "@/lib/track";
import { useLibrary } from "@/store/library";

const MENU_WIDTH = 224; // px — matches w-56
const MENU_MAX_HEIGHT = 300;

type Props = {
  track: Track;
  /** Set when the track is being shown inside a playlist, so we can
   *  offer "remove from this playlist" as well as adding to others. */
  currentPlaylistId?: string;
  /** Extra classes for the trigger button. */
  className?: string;
  title?: string;
};

/**
 * The "+" menu for putting a track into a playlist.
 *
 * The menu is positioned `fixed`, not `absolute`. An absolutely positioned
 * dropdown is clipped by the scrolling track list, so rows near the bottom
 * would show a menu cut in half. Fixed + measured coordinates escapes the
 * scroll container entirely.
 */
export default function PlaylistMenu({
  track,
  currentPlaylistId,
  className = "",
  title = "Add to playlist",
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const playlists = useLibrary((s) => s.playlists);
  const addToPlaylist = useLibrary((s) => s.addToPlaylist);
  const removeFromPlaylist = useLibrary((s) => s.removeFromPlaylist);
  const createPlaylist = useLibrary((s) => s.createPlaylist);

  /* Measure before the browser paints, so the menu never appears in the
     wrong place for a frame and then jump. */
  useLayoutEffect(() => {
    if (!open) return;

    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;

    // Not enough room underneath? Open upwards instead.
    const top =
      spaceBelow < MENU_MAX_HEIGHT
        ? Math.max(8, rect.top - MENU_MAX_HEIGHT - 4)
        : rect.bottom + 4;

    // Keep it on screen horizontally too.
    const left = Math.min(
      Math.max(8, rect.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - 8,
    );

    setPos({ top, left });
  }, [open]);

  /* A scroll or resize would leave the menu floating in the wrong spot. */
  useLayoutEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  async function handleNew() {
    const name = window.prompt("Playlist name");
    if (name === null) return;

    // Returns null when nobody is signed in — the store opens the
    // sign-in dialog instead.
    const playlist = await createPlaylist(name);
    if (playlist) await addToPlaylist(playlist.id, track);
    setOpen(false);
  }

  const others = playlists.filter((p) => p.id !== currentPlaylistId);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className={className}
        aria-label={title}
        aria-expanded={open}
        title={title}
      >
        +
      </button>

      {open && pos && (
        <>
          {/* Any click outside closes the menu — no document listeners. */}
          <button
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            tabIndex={-1}
          />

          <div
            className="fixed z-50 w-56 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-2xl"
            style={{
              top: pos.top,
              left: pos.left,
              maxHeight: MENU_MAX_HEIGHT,
            }}
          >
            <p className="truncate px-2 py-1.5 text-[11px] uppercase tracking-wide text-muted">
              Add to playlist
            </p>

            {others.length === 0 && (
              <p className="px-2 pb-1.5 text-xs text-muted">
                No other playlists yet.
              </p>
            )}

            {others.map((p) => {
              const already = p.tracks.some((t) => t.id === track.id);
              return (
                <button
                  key={p.id}
                  disabled={already}
                  onClick={async () => {
                    await addToPlaylist(p.id, track);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition hover:bg-surface-2 disabled:cursor-default disabled:text-muted disabled:hover:bg-transparent"
                >
                  <span className="truncate">{p.name}</span>
                  {already && <span className="ml-auto text-xs">✓</span>}
                </button>
              );
            })}

            <button
              onClick={handleNew}
              className="mt-1 block w-full rounded border-t border-line px-2 py-1.5 text-left text-sm text-accent transition hover:bg-surface-2"
            >
              + New playlist
            </button>

            {currentPlaylistId && (
              <button
                onClick={async () => {
                  await removeFromPlaylist(currentPlaylistId, track.id);
                  setOpen(false);
                }}
                className="mt-1 block w-full rounded border-t border-line px-2 py-1.5 text-left text-sm text-red-300 transition hover:bg-surface-2"
              >
                Remove from this playlist
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
