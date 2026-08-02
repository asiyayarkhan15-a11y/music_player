/**
 * One Track shape for both music sources.
 *
 * The rest of the app never asks "is this Audius or YouTube?" except in two
 * places: the little source badge on each row, and which playback engine
 * the store hands it to. Everything else — favorites, playlists, the queue,
 * the player bar — treats every track identically.
 */

export type TrackSource = "audius" | "youtube";

export type Track = {
  /**
   * Globally unique, e.g. "audius:95wro" or "youtube:dQw4w9WgXcQ".
   *
   * The source is baked into the id on purpose. Both services could hand us
   * the same short string, and if they did, favoriting an Audius track would
   * silently favorite a YouTube one too.
   */
  id: string;
  source: TrackSource;
  /** The id within its own service, used to build the stream / embed. */
  sourceId: string;

  title: string;
  artist: string;
  artwork: string | null;
  /** Seconds. 0 means "unknown until it starts playing". */
  duration: number;
  genre: string;
  /** Audius reports plays; YouTube views. null when neither is known. */
  playCount: number | null;
};

export function makeTrackId(source: TrackSource, sourceId: string): string {
  return `${source}:${sourceId}`;
}
