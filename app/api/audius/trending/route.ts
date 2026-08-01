import { NextRequest, NextResponse } from "next/server";
import { getTrending } from "@/lib/audius";

/**
 * GET /api/audius/trending?genre=Electronic
 *
 * Used for the home page, so the app is never empty when someone arrives,
 * and for the genre category buttons.
 */
export async function GET(request: NextRequest) {
  const genre = request.nextUrl.searchParams.get("genre")?.trim() || undefined;

  try {
    const tracks = await getTrending(genre);
    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("[audius/trending]", error);
    return NextResponse.json(
      { tracks: [], error: "Could not reach Audius. Please try again." },
      { status: 502 },
    );
  }
}
