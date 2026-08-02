/**
 * YouTube Data API v3 — search only. Playback happens in the browser
 * through the IFrame player (see lib/engines.ts), never through us.
 *
 * ⚠️ QUOTA. This is the constraint that shapes this whole file.
 *
 *      Free allowance   10,000 units per day
 *      search.list         100 units   ← expensive
 *      videos.list           1 unit    ← cheap
 *
 * So roughly 100 searches per day for ALL visitors combined, resetting at
 * midnight Pacific time. That is why every response is cached for 24 hours
 * and why we spend the extra 1-unit videos.list call: it buys us real
 * durations and lets us drop videos that cannot be embedded.
 */

import { type Track, makeTrackId } from "@/lib/track";

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

/** Category 10 is "Music". Keeps interviews and reaction videos out. */
const MUSIC_CATEGORY = "10";

const DAY_SECONDS = 60 * 60 * 24;

export type YouTubeResult = {
  tracks: Track[];
  /** True when the daily quota is gone — the UI explains it to the user. */
  quotaExceeded: boolean;
  /** True when no API key is configured, so YouTube is simply switched off. */
  disabled: boolean;
};

export function isYouTubeEnabled(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

/**
 * YouTube returns durations as ISO 8601: "PT4M13S", "PT1H2M3S", "PT45S".
 * Turn that into plain seconds.
 */
export function parseISODuration(value: string): number {
  const match = /^P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match) return 0;
  const [, h, m, s] = match;
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}

/**
 * YouTube titles are noisy: "Song Name (Official Music Video) [4K]".
 * Strip the promotional brackets but keep anything meaningful, so
 * "Song (feat. Someone)" survives intact.
 */
const NOISE =
  /\((?=[^)]*\b(?:official|lyric|lyrics|audio|video|visualizer|hd|4k|mv|full song)\b)[^)]*\)|\[(?=[^\]]*\b(?:official|lyric|lyrics|audio|video|visualizer|hd|4k|mv|full song)\b)[^\]]*\]/gi;

export function cleanTitle(title: string): string {
  return title.replace(NOISE, "").replace(/\s{2,}/g, " ").trim() || title;
}

/** YouTube channel names often end in " - Topic" on auto-generated channels. */
function cleanChannel(name: string): string {
  return name.replace(/\s*-\s*Topic$/i, "").trim();
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function quotaExceededIn(json: any): boolean {
  const errors = json?.error?.errors;
  return (
    Array.isArray(errors) &&
    errors.some(
      (e: any) => e?.reason === "quotaExceeded" || e?.reason === "dailyLimitExceeded",
    )
  );
}

export async function searchYouTube(
  query: string,
  limit = 15,
): Promise<YouTubeResult> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return { tracks: [], quotaExceeded: false, disabled: true };
  if (!query.trim()) return { tracks: [], quotaExceeded: false, disabled: false };

  /* ---- step 1: search (100 units) ---- */
  const searchParams = new URLSearchParams({
    key,
    q: query,
    part: "snippet",
    type: "video",
    videoCategoryId: MUSIC_CATEGORY,
    // Ask YouTube to exclude un-embeddable videos up front. We verify
    // again in step 2, because this filter is not perfectly reliable.
    videoEmbeddable: "true",
    maxResults: String(limit),
  });

  const searchRes = await fetch(`${SEARCH_URL}?${searchParams}`, {
    next: { revalidate: DAY_SECONDS },
  });
  const searchJson = await searchRes.json();

  if (!searchRes.ok) {
    if (quotaExceededIn(searchJson)) {
      return { tracks: [], quotaExceeded: true, disabled: false };
    }
    throw new Error(
      `YouTube search failed (${searchRes.status}): ${
        searchJson?.error?.message ?? "unknown error"
      }`,
    );
  }

  const ids: string[] = (searchJson.items ?? [])
    .map((item: any) => item?.id?.videoId)
    .filter(Boolean);

  if (ids.length === 0) {
    return { tracks: [], quotaExceeded: false, disabled: false };
  }

  /* ---- step 2: details (1 unit for up to 50 ids) ---- */
  const videoParams = new URLSearchParams({
    key,
    id: ids.join(","),
    part: "snippet,contentDetails,status,statistics",
  });

  const videoRes = await fetch(`${VIDEOS_URL}?${videoParams}`, {
    next: { revalidate: DAY_SECONDS },
  });
  const videoJson = await videoRes.json();

  if (!videoRes.ok) {
    if (quotaExceededIn(videoJson)) {
      return { tracks: [], quotaExceeded: true, disabled: false };
    }
    throw new Error(`YouTube videos lookup failed (${videoRes.status})`);
  }

  const tracks: Track[] = (videoJson.items ?? [])
    // Same lesson as Audius `is_streamable`: drop what will not play.
    .filter((v: any) => v?.status?.embeddable === true && v?.id)
    .map((v: any): Track => {
      const thumbs = v.snippet?.thumbnails ?? {};
      return {
        id: makeTrackId("youtube", v.id),
        source: "youtube",
        sourceId: v.id,
        title: cleanTitle(v.snippet?.title ?? "Untitled"),
        artist: cleanChannel(v.snippet?.channelTitle ?? "Unknown"),
        artwork:
          thumbs.maxres?.url ??
          thumbs.high?.url ??
          thumbs.medium?.url ??
          thumbs.default?.url ??
          null,
        duration: parseISODuration(v.contentDetails?.duration ?? ""),
        genre: "YouTube",
        playCount: v.statistics?.viewCount
          ? Number(v.statistics.viewCount)
          : null,
      };
    })
    // Live streams report duration 0, and hour-long compilations are not
    // songs. Keep anything from 30 seconds to 20 minutes.
    .filter((t: Track) => t.duration >= 30 && t.duration <= 20 * 60);

  return { tracks, quotaExceeded: false, disabled: false };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
