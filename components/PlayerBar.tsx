"use client";

import { usePlayer, useCurrentTrack } from "@/store/player";
import { useLibrary } from "@/store/library";
import { formatTime } from "@/lib/format";
import {
  PlayIcon,
  PauseIcon,
  PrevIcon,
  NextIcon,
  ShuffleIcon,
  RepeatIcon,
  RepeatOneIcon,
  VolumeIcon,
  MuteIcon,
  HeartIcon,
  MusicIcon,
  SpinnerIcon,
} from "@/components/icons";

/**
 * The seek bar is its own component ON PURPOSE.
 *
 * `currentTime` changes about four times a second. Anything that reads it
 * re-renders that often. By isolating it here, only this small piece
 * re-renders — the artwork, title and buttons around it stay still.
 */
function SeekBar() {
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const seek = usePlayer((s) => s.seek);
  const hasTrack = usePlayer((s) => s.queue.length > 0);

  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex w-full items-center gap-2">
      <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted">
        {formatTime(currentTime)}
      </span>

      <input
        type="range"
        className="range flex-1"
        min={0}
        max={duration || 0}
        step={0.5}
        value={currentTime}
        disabled={!hasTrack}
        onChange={(e) => seek(Number(e.target.value))}
        aria-label="Seek"
        // The CSS gradient reads this to paint the filled part.
        style={{ "--progress": `${percent}%` } as React.CSSProperties}
      />

      <span className="w-10 shrink-0 text-[11px] tabular-nums text-muted">
        {formatTime(duration)}
      </span>
    </div>
  );
}

function VolumeControl() {
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);

  const shown = muted ? 0 : volume;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleMute}
        className="rounded p-1.5 text-muted transition hover:text-fg"
        aria-label={muted ? "Unmute" : "Mute"}
        title="Mute (M)"
      >
        {muted || volume === 0 ? <MuteIcon /> : <VolumeIcon />}
      </button>

      <input
        type="range"
        className="range w-24"
        min={0}
        max={1}
        step={0.01}
        value={shown}
        onChange={(e) => setVolume(Number(e.target.value))}
        aria-label="Volume"
        style={{ "--progress": `${shown * 100}%` } as React.CSSProperties}
      />
    </div>
  );
}

export default function PlayerBar() {
  const track = useCurrentTrack();
  const isPlaying = usePlayer((s) => s.isPlaying);
  const isLoading = usePlayer((s) => s.isLoading);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);

  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const previous = usePlayer((s) => s.previous);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);

  const isFavorite = useLibrary((s) => s.isFavorite);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const favorited = track ? isFavorite(track.id) : false;

  return (
    <footer className="border-t border-line bg-surface/95 px-3 py-2.5 backdrop-blur sm:px-4">
      <div className="mx-auto grid max-w-[1600px] grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
        {/* ---------------- now playing ---------------- */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-surface-2">
            {track?.artwork ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={track.artwork}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
            ) : (
              <MusicIcon className="size-5 text-muted" />
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {track?.title ?? "Nothing playing"}
            </p>
            <p className="truncate text-xs text-muted">
              {track?.artist ?? "Pick a song to start"}
            </p>
          </div>

          {track && (
            <button
              onClick={() => toggleFavorite(track)}
              className={`ml-1 hidden shrink-0 rounded p-1.5 transition sm:block ${
                favorited ? "text-accent" : "text-muted hover:text-fg"
              }`}
              aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={favorited}
            >
              <HeartIcon filled={favorited} className="size-4" />
            </button>
          )}
        </div>

        {/* ---------------- transport ---------------- */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1">
            <button
              onClick={toggleShuffle}
              className={`rounded p-2 transition ${
                shuffle ? "text-accent" : "text-muted hover:text-fg"
              }`}
              aria-label="Shuffle"
              aria-pressed={shuffle}
              title="Shuffle"
            >
              <ShuffleIcon />
            </button>

            <button
              onClick={previous}
              className="rounded p-2 text-muted transition hover:text-fg"
              aria-label="Previous track"
              title="Previous (P)"
            >
              <PrevIcon />
            </button>

            <button
              onClick={togglePlay}
              disabled={!track}
              className="mx-1 grid size-10 place-items-center rounded-full bg-fg text-bg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              aria-label={isPlaying ? "Pause" : "Play"}
              title="Play / pause (Space)"
            >
              {isLoading ? (
                <SpinnerIcon className="size-4" />
              ) : isPlaying ? (
                <PauseIcon />
              ) : (
                <PlayIcon className="ml-0.5 size-5" />
              )}
            </button>

            <button
              onClick={() => next()}
              className="rounded p-2 text-muted transition hover:text-fg"
              aria-label="Next track"
              title="Next (N)"
            >
              <NextIcon />
            </button>

            <button
              onClick={cycleRepeat}
              className={`rounded p-2 transition ${
                repeat !== "off" ? "text-accent" : "text-muted hover:text-fg"
              }`}
              aria-label={`Repeat: ${repeat}`}
              title={`Repeat: ${repeat}`}
            >
              {repeat === "one" ? <RepeatOneIcon /> : <RepeatIcon />}
            </button>
          </div>

          <div className="hidden w-full max-w-xl md:block">
            <SeekBar />
          </div>
        </div>

        {/* ---------------- volume ---------------- */}
        <div className="hidden justify-end md:flex">
          <VolumeControl />
        </div>
      </div>

      {/* On narrow screens the seek bar moves below the buttons. */}
      <div className="mx-auto mt-2 max-w-[1600px] md:hidden">
        <SeekBar />
      </div>
    </footer>
  );
}
