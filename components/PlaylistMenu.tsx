"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Track } from "@/lib/track";
import { useLibrary } from "@/store/library";
import { usePlayer } from "@/store/player";

const MENU_WIDTH = 224; // px — matches w-56
const MENU_MAX_HEIGHT = 300;
const EDGE = 8;

type Props = {
  track: Track;
  /** Set when the track is being shown inside a playlist, so we can
   *  offer "remove from this playlist" as well as adding to others. */
  currentPlaylistId?: string;
  /** Extra classes for the trigger button. */
  className?: string;
  title?: string;
  /** What the button shows. Defaults to "+". */
  trigger?: React.ReactNode;
  /** Offer "Remove from queue" — used by the player bar. */
  showQueueRemove?: boolean;
};

/**
 * The "+" menu for putting a track into a playlist.
 *
 * ⚠️ The menu is rendered into <body> through a portal, NOT where it sits
 * in the JSX. Two ancestors would otherwise break it:
 *
 *   - the scrolling track list CLIPS an absolutely positioned menu, so
 *     rows near the bottom showed a menu cut in half;
 *   - the player bar has `backdrop-blur`, and a backdrop-filter makes an
 *     element a containing block for `position: fixed` children — so a
 *     fixed menu inside it was positioned relative to the player bar and
 *     landed far below the visible screen.
 *
 * A portal escapes both: nothing between the menu and <body> can clip it,
 * capture it, or shift its coordinates.
 */
export default function PlaylistMenu({
  track,
  currentPlaylistId,
  className = "",
  title = "Add to playlist",
  trigger = "+",
  showQueueRemove = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const playlists = useLibrary((s) => s.playlists);
  const addToPlaylist = useLibrary((s) => s.addToPlaylist);
  const removeFromPlaylist = useLibrary((s) => s.removeFromPlaylist);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const removeFromQueue = usePlayer((s) => s.removeFromQueue);

  /* Portals need a real document, which does not exist during SSR. */
  useEffect(() => setMounted(true), []);

  const reposition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;

    // Not enough room underneath? Open upwards instead.
    const top =
      spaceBelow < MENU_MAX_HEIGHT + EDGE
        ? Math.max(EDGE, rect.top - MENU_MAX_HEIGHT - 4)
        : rect.bottom + 4;

    // Right-aligned to the button, but never off the side of the screen.
    const left = Math.min(
      Math.max(EDGE, rect.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - EDGE,
    );

    setPos({ top, left });
  }, []);

  /* Measure before paint so the menu never flashes in the wrong place. */
  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  /*
   * Follow the button when the page scrolls, rather than closing.
   *
   * Closing on scroll was tempting but fragile: clicking a button can make
   * the browser scroll it into view, which would fire immediately and shut
   * the menu before it was ever seen.
   */
  useEffect(() => {
    if (!open) return;

    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, reposition]);

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

  const menu = open && pos && (
    <>
      {/* Any click outside closes the menu — no document listeners. */}
      <button
        className="fixed inset-0 z-[100] cursor-default"
        onClick={() => setOpen(false)}
        aria-label="Close menu"
        tabIndex={-1}
      />

      <div
        className="fixed z-[101] w-56 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-2xl"
        style={{ top: pos.top, left: pos.left, maxHeight: MENU_MAX_HEIGHT }}
        role="menu"
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
                setOpen(false);
                await addToPlaylist(p.id, track);
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition hover:bg-surface-2 disabled:cursor-default disabled:text-muted disabled:hover:bg-transparent"
              role="menuitem"
            >
              <span className="truncate">{p.name}</span>
              {already && <span className="ml-auto text-xs">✓</span>}
            </button>
          );
        })}

        <button
          onClick={handleNew}
          className="mt-1 block w-full rounded border-t border-line px-2 py-1.5 text-left text-sm text-accent transition hover:bg-surface-2"
          role="menuitem"
        >
          + New playlist
        </button>

        {(showQueueRemove || currentPlaylistId) && (
          <div className="mt-1 border-t border-line pt-1">
            {showQueueRemove && (
              <button
                onClick={() => {
                  setOpen(false);
                  removeFromQueue(track.id);
                }}
                className="block w-full rounded px-2 py-1.5 text-left text-sm transition hover:bg-surface-2"
                role="menuitem"
              >
                Remove from queue
                <span className="block text-[11px] text-muted">
                  Skips it now, keeps it saved
                </span>
              </button>
            )}

            {currentPlaylistId && (
              <button
                onClick={async () => {
                  setOpen(false);
                  await removeFromPlaylist(currentPlaylistId, track.id);
                }}
                className="block w-full rounded px-2 py-1.5 text-left text-sm text-red-300 transition hover:bg-surface-2"
                role="menuitem"
              >
                Remove from this playlist
                <span className="block text-[11px] text-muted">
                  Deletes it from the playlist
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className={className}
        aria-label={title}
        aria-haspopup="menu"
        aria-expanded={open}
        title={title}
      >
        {trigger}
      </button>

      {/* Rendered at the end of <body>, outside every ancestor. */}
      {mounted && menu ? createPortal(menu, document.body) : null}
    </>
  );
}
