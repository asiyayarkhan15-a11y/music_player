import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/audius";

/**
 * GET /api/audius/search?q=lofi
 *
 * This runs on YOUR server, not in the browser. That gives us:
 *   - one place to handle Audius being down
 *   - caching, so we don't hammer a free API
 *   - a small clean response (11 fields) instead of Audius's ~100
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ tracks: [] });
  }

  try {
    const tracks = await searchTracks(query);
    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("[audius/search]", error);
    return NextResponse.json(
      { tracks: [], error: "Could not reach Audius. Please try again." },
      { status: 502 },
    );
  }
}
