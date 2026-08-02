import { NextRequest, NextResponse } from "next/server";
import { getTrending } from "@/lib/audius";

/**
 * GET /api/trending?genre=Electronic
 *
 * Audius only. YouTube has no free "what is popular" endpoint that does not
 * cost a full 100-unit search, so the browse page stays on Audius — which
 * is free and unlimited. YouTube is spent only on real searches.
 */
export async function GET(request: NextRequest) {
  const genre = request.nextUrl.searchParams.get("genre")?.trim() || undefined;

  try {
    const tracks = await getTrending(genre);
    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("[trending]", error);
    return NextResponse.json(
      { tracks: [], error: "Could not reach Audius. Please try again." },
      { status: 502 },
    );
  }
}
