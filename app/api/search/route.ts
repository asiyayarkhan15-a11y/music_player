import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/audius";
import { searchYouTube } from "@/lib/youtube";
import type { Track } from "@/lib/track";

export type YouTubeStatus = "ok" | "quota" | "disabled" | "error";

/**
 * GET /api/search?q=arijit+singh
 *
 * Asks Audius and YouTube at the same time and returns both lists.
 *
 * `Promise.allSettled` rather than `Promise.all` is the important detail:
 * if YouTube is out of quota or Google is down, the Audius results still
 * come back. One source failing must never blank the page.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({
      audius: [],
      youtube: [],
      youtubeStatus: "ok" satisfies YouTubeStatus,
    });
  }

  const [audiusResult, youtubeResult] = await Promise.allSettled([
    searchTracks(query),
    searchYouTube(query),
  ]);

  const audius: Track[] =
    audiusResult.status === "fulfilled" ? audiusResult.value : [];

  let youtube: Track[] = [];
  let youtubeStatus: YouTubeStatus = "ok";

  if (youtubeResult.status === "fulfilled") {
    const value = youtubeResult.value;
    youtube = value.tracks;
    if (value.disabled) youtubeStatus = "disabled";
    else if (value.quotaExceeded) youtubeStatus = "quota";
  } else {
    console.error("[search] youtube", youtubeResult.reason);
    youtubeStatus = "error";
  }

  if (audiusResult.status === "rejected") {
    console.error("[search] audius", audiusResult.reason);
  }

  return NextResponse.json({
    audius,
    youtube,
    youtubeStatus,
    audiusFailed: audiusResult.status === "rejected",
  });
}
