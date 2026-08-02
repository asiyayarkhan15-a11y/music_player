"use client";

import type { Track } from "@/lib/track";
import { usePlayer, useCurrentTrack } from "@/store/player";
import TrackRow from "@/components/TrackRow";

type Props = {
  tracks: Track[];
  emptyMessage?: string;
  /** Set when showing a playlist, so rows can offer "remove from this one". */
  playlistId?: string;
};

export default function TrackList({
  tracks,
  emptyMessage = "Nothing here yet.",
  playlistId,
}: Props) {
  const current = useCurrentTrack();
  const isPlaying = usePlayer((s) => s.isPlaying);
  const playQueue = usePlayer((s) => s.playQueue);
  const togglePlay = usePlayer((s) => s.togglePlay);

  if (tracks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {tracks.map((track, index) => {
        const isCurrent = current?.id === track.id;

        return (
          <TrackRow
            key={`${track.id}-${index}`}
            track={track}
            index={index}
            isCurrent={isCurrent}
            isPlaying={isPlaying}
            playlistId={playlistId}
            onPlay={() => {
              // Clicking the song already playing pauses it instead of
              // restarting from the beginning.
              if (isCurrent) togglePlay();
              // The WHOLE list becomes the queue, starting at this song.
              // That is what makes "next" work through the rest of the list.
              else playQueue(tracks, index);
            }}
          />
        );
      })}
    </div>
  );
}
