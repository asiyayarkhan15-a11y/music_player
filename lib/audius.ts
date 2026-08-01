/**
 * Everything that talks to Audius lives in this one file.
 *
 * Two rules we learned by inspecting the real API response:
 *   1. Audius sends ~100 fields per track. We keep 11 and drop the rest.
 *   2. Some tracks have `is_streamable: false` (the artist deleted their
 *      account). Those play silence, so we filter them out.
 */

/** Audius counts requests per app. No key, no signup — just a name. */
export const APP_NAME = "MusicPlayerApp";

/** Used if the registry lookup fails. Today the registry returns this anyway. */
const FALLBACK_HOST = "https://api.audius.co";

/** The clean shape the rest of our app uses. 11 fields instead of ~100. */
export type Track = {
  id: string; // "95wro" — TEXT id. Never use `track_id` (the number).
  title: string;
  artist: string;
  artistHandle: string;
  artwork: string | null; // can genuinely be missing
  duration: number; // seconds
  genre: string;
  mood: string | null;
  tags: string[];
  playCount: number;
  favoriteCount: number;
};

/* ------------------------------------------------------------------ *
 * Which server do we talk to?
 * ------------------------------------------------------------------ */

let cachedHost: string | null = null;
let cachedAt = 0;
const HOST_TTL_MS = 30 * 60 * 1000; // re-check every 30 minutes

/**
 * Audius is decentralised: you ask a registry which servers are alive,
 * then talk to one of them. Today the registry returns a single host,
 * but reading it from the list (instead of hardcoding) means our app
 * keeps working if they add servers back.
 */
export async function getHost(): Promise<string> {
  if (cachedHost && Date.now() - cachedAt < HOST_TTL_MS) return cachedHost;

  try {
    const res = await fetch("https://api.audius.co", {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    const host = json?.data?.[0];

    if (typeof host === "string" && host.startsWith("http")) {
      cachedHost = host;
      cachedAt = Date.now();
      return host;
    }
  } catch {
    // Registry unreachable — fall through to the fallback below.
  }

  return FALLBACK_HOST;
}

/* ------------------------------------------------------------------ *
 * Turning Audius data into our data
 * ------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalize(t: any): Track {
  return {
    id: t.id,
    title: t.title ?? "Untitled",
    artist: t.user?.name ?? t.user?.handle ?? "Unknown artist",
    artistHandle: t.user?.handle ?? "",
    // `artwork` is an object of sizes and may be absent entirely.
    artwork: t.artwork?.["480x480"] ?? t.artwork?.["150x150"] ?? null,
    duration: typeof t.duration === "number" ? t.duration : 0,
    genre: t.genre || "Unknown",
    mood: t.mood || null,
    // `tags` arrives as ONE comma-separated string, not an array.
    tags:
      typeof t.tags === "string" && t.tags.length > 0
        ? t.tags.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
    playCount: t.play_count ?? 0,
    favoriteCount: t.favorite_count ?? 0,
  };
}

/** Drop unplayable tracks, then shrink each one. */
function toTracks(raw: unknown): Track[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t: any) => t?.is_streamable === true && t?.id)
    .map(normalize);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ------------------------------------------------------------------ *
 * The requests
 * ------------------------------------------------------------------ */

async function audiusGet(path: string, params: Record<string, string>) {
  const host = await getHost();
  const query = new URLSearchParams({ ...params, app_name: APP_NAME });
  const res = await fetch(`${host}/v1${path}?${query}`, {
    // Cache on our server so repeated searches don't hammer a free API.
    next: { revalidate: 60 },
  });

  if (!res.ok) throw new Error(`Audius responded ${res.status}`);
  return res.json();
}

export async function searchTracks(query: string, limit = 30): Promise<Track[]> {
  if (!query.trim()) return [];
  const json = await audiusGet("/tracks/search", {
    query,
    limit: String(limit),
  });
  return toTracks(json?.data);
}

export async function getTrending(genre?: string, limit = 30): Promise<Track[]> {
  const params: Record<string, string> = { limit: String(limit), time: "week" };
  if (genre) params.genre = genre;

  const json = await audiusGet("/tracks/trending", params);
  return toTracks(json?.data);
}

/* ------------------------------------------------------------------ *
 * Playing audio
 * ------------------------------------------------------------------ */

/**
 * The address to put in <audio src="...">.
 *
 * The search response DOES contain a ready-made `stream.url`, but it is
 * signed with a timestamp and expires. Building the URL at play time asks
 * Audius for a fresh signed link every time, so it never goes stale.
 *
 * Note this points straight at Audius, NOT through our own server.
 * Audio files are large; proxying them through Vercel would burn
 * bandwidth for no benefit.
 */
export function streamUrl(trackId: string): string {
  return `${FALLBACK_HOST}/v1/tracks/${trackId}/stream?app_name=${APP_NAME}`;
}

/** Genres Audius actually uses — for the category filter buttons. */
export const GENRES = [
  "Electronic",
  "Hip-Hop/Rap",
  "Lo-Fi",
  "Rock",
  "Pop",
  "Ambient",
  "House",
  "Jazz",
  "Deep House",
  "Drum & Bass",
] as const;
