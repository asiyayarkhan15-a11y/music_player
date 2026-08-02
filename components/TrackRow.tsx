"use client";

import type { Track } from "@/lib/track";
import { formatTime, formatCount } from "@/lib/format";
import { useLibrary } from "@/store/library";
import PlaylistMenu from "@/components/PlaylistMenu";
import { HeartIcon, MusicIcon, PlayIcon, PauseIcon } from "@/components/icons";

/** Three little bars that bounce while a track is playing. */
function NowPlayingBars() {
  return (
    <span className="flex h-4 items-end gap-[2px]" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-accent"
          style={{
            animation: `mp-bounce 900ms ease-in-out ${i * 150}ms infinite`,
            height: "100%",
          }}
        />
      ))}
      <style>{`
        @keyframes mp-bounce {
          0%, 100% { transform: scaleY(0.35); }
          50%      { transform: scaleY(1); }
        }
      `}</style>
    </span>
  );
}

type Props = {
  track: Track;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  /** Set when this row is inside a playlist, so the menu can offer removal. */
  playlistId?: string;
};

export default function TrackRow({
  track,
  index,
  isCurrent,
  isPlaying,
  onPlay,
  playlistId,
}: Props) {
  const isFavorite = useLibrary((s) => s.isFavorite);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);

  const favorited = isFavorite(track.id);

  return (
    <div
      className={`group grid grid-cols-[2rem_auto_1fr_auto] items-center gap-3 rounded-lg px-2 py-2 transition sm:grid-cols-[2rem_auto_1fr_auto_auto_auto] ${
        isCurrent ? "bg-surface-2" : "hover:bg-surface-2/60"
      }`}
    >
      {/* index / play button */}
      <button
        onClick={onPlay}
        className="grid size-8 place-items-center rounded text-sm tabular-nums text-muted transition hover:text-fg"
        aria-label={`Play ${track.title} by ${track.artist}`}
      >
        {isCurrent && isPlaying ? (
          <span className="hidden group-hover:block">
            <PauseIcon className="size-4 text-fg" />
          </span>
        ) : (
          <span className="hidden group-hover:block">
            <PlayIcon className="size-4 text-fg" />
          </span>
        )}
        <span className="group-hover:hidden">
          {isCurrent && isPlaying ? (
            <NowPlayingBars />
          ) : (
            <span className={isCurrent ? "text-accent" : ""}>{index + 1}</span>
          )}
        </span>
      </button>

      {/* artwork */}
      <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded bg-surface-2">
        {track.artwork ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.artwork}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <MusicIcon className="size-4 text-muted" />
        )}
      </div>

      {/* title + artist */}
      <button onClick={onPlay} className="min-w-0 text-left">
        <p
          className={`truncate text-sm font-medium ${
            isCurrent ? "text-accent" : ""
          }`}
        >
          {track.title}
        </p>
        <p className="truncate text-xs text-muted">{track.artist}</p>
      </button>

      {/* Where this track comes from. YouTube is marked clearly because it
          plays as a video and behaves differently from an Audius stream. */}
      <span
        className={`hidden max-w-[10rem] truncate rounded-full px-2.5 py-1 text-[11px] sm:block ${
          track.source === "youtube"
            ? "bg-red-500/15 text-red-300"
            : "bg-surface-2 text-muted"
        }`}
      >
        {track.source === "youtube" ? "YouTube" : track.genre}
      </span>

      {/* Audius counts plays, YouTube counts views. */}
      <span className="hidden text-xs tabular-nums text-muted sm:block">
        {track.playCount !== null
          ? `${formatCount(track.playCount)} ${
              track.source === "youtube" ? "views" : "plays"
            }`
          : ""}
      </span>

      {/* actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => toggleFavorite(track)}
          className={`rounded p-1.5 transition ${
            favorited
              ? "text-accent"
              : "text-muted opacity-0 hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
          }`}
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={favorited}
        >
          <HeartIcon filled={favorited} className="size-4" />
        </button>

        <PlaylistMenu
          track={track}
          currentPlaylistId={playlistId}
          className="rounded px-2 py-1 text-lg leading-none text-muted opacity-0 transition hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
        />

        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted">
          {formatTime(track.duration)}
        </span>
      </div>
    </div>
  );
}
