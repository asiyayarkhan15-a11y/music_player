"use client";

import { useLibrary } from "@/store/library";
import { HeartIcon, TrendingIcon, MusicIcon } from "@/components/icons";

export type View =
  | { kind: "browse" }
  | { kind: "favorites" }
  | { kind: "playlist"; id: string };

type Props = {
  view: View;
  onChange: (view: View) => void;
};

/**
 * Vertical sidebar on desktop, horizontal scrolling strip on phones.
 * One component, the difference is purely CSS.
 */
export default function Sidebar({ view, onChange }: Props) {
  const playlists = useLibrary((s) => s.playlists);
  const favorites = useLibrary((s) => s.favorites);
  const createPlaylist = useLibrary((s) => s.createPlaylist);

  const itemClass = (active: boolean) =>
    `flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
      active
        ? "bg-surface-2 text-fg"
        : "text-muted hover:bg-surface-2/60 hover:text-fg"
    }`;

  async function handleCreate() {
    const name = window.prompt("Playlist name");
    if (name === null) return;
    const playlist = await createPlaylist(name);
    onChange({ kind: "playlist", id: playlist.id });
  }

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line bg-surface p-2 md:w-60 md:shrink-0 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:p-3">
      <div className="mb-1 hidden items-center gap-2 px-2 py-2 md:flex">
        <span className="grid size-7 place-items-center rounded-md bg-accent-strong text-bg">
          <MusicIcon className="size-4" />
        </span>
        <span className="text-sm font-semibold tracking-tight">Music Player</span>
      </div>

      <button
        onClick={() => onChange({ kind: "browse" })}
        className={itemClass(view.kind === "browse")}
      >
        <TrendingIcon className="size-4" />
        Browse
      </button>

      <button
        onClick={() => onChange({ kind: "favorites" })}
        className={itemClass(view.kind === "favorites")}
      >
        <HeartIcon className="size-4" />
        Favorites
        {favorites.length > 0 && (
          <span className="ml-auto hidden text-xs tabular-nums text-muted md:inline">
            {favorites.length}
          </span>
        )}
      </button>

      <div className="mt-0 hidden border-t border-line pt-3 md:mt-3 md:block">
        <div className="flex items-center justify-between px-3 pb-1">
          <span className="text-[11px] uppercase tracking-wide text-muted">
            Playlists
          </span>
          <button
            onClick={handleCreate}
            className="rounded px-1.5 text-lg leading-none text-muted transition hover:text-fg"
            aria-label="New playlist"
            title="New playlist"
          >
            +
          </button>
        </div>
      </div>

      {playlists.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange({ kind: "playlist", id: p.id })}
          className={itemClass(view.kind === "playlist" && view.id === p.id)}
        >
          <MusicIcon className="size-4 shrink-0" />
          <span className="truncate">{p.name}</span>
          <span className="ml-auto hidden text-xs tabular-nums text-muted md:inline">
            {p.tracks.length}
          </span>
        </button>
      ))}

      {/* On phones the "+" lives inline, since the section header is hidden. */}
      <button
        onClick={handleCreate}
        className={`${itemClass(false)} md:hidden`}
        aria-label="New playlist"
      >
        + New
      </button>
    </nav>
  );
}
