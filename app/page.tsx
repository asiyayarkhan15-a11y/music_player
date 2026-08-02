"use client";

import { useEffect, useMemo, useState } from "react";
import type { Track } from "@/lib/track";
import { GENRES } from "@/lib/audius";
import { useLibrary } from "@/store/library";
import Sidebar, { type View } from "@/components/Sidebar";
import SearchBar from "@/components/SearchBar";
import TrackList from "@/components/TrackList";
import PlayerBar from "@/components/PlayerBar";
import AuthDialog from "@/components/AuthDialog";
import { usePlayer } from "@/store/player";
import { useAuth } from "@/store/auth";

type YouTubeStatus = "ok" | "quota" | "disabled" | "error";

export default function Home() {
  const [view, setView] = useState<View>({ kind: "browse" });

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [genre, setGenre] = useState<string | null>(null);

  const [audiusHits, setAudiusHits] = useState<Track[]>([]);
  const [youtubeHits, setYoutubeHits] = useState<Track[]>([]);
  const [ytStatus, setYtStatus] = useState<YouTubeStatus>("ok");

  const [trending, setTrending] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLibrary = useLibrary((s) => s.load);
  const favorites = useLibrary((s) => s.favorites);
  const playlists = useLibrary((s) => s.playlists);
  const playbackError = usePlayer((s) => s.lastError);
  const initAuth = useAuth((s) => s.init);
  const user = useAuth((s) => s.user);

  /* Start listening for the login session. This also picks up the
     `?code=...` that the magic-link email sends people back with. */
  useEffect(() => initAuth(), [initAuth]);

  /* Load saved music whenever the signed-in user changes — including on
     sign-out, when `load` empties the lists. */
  useEffect(() => {
    loadLibrary();
  }, [loadLibrary, user]);

  /* Wait 300ms after the last keystroke before searching.
     Without this, typing "lofi" fires four separate requests — and each
     one would spend 100 units of the YouTube daily quota. */
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  /* Search both sources. */
  useEffect(() => {
    if (!debounced) {
      setAudiusHits([]);
      setYoutubeHits([]);
      setYtStatus("ok");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/search?q=${encodeURIComponent(debounced)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        setAudiusHits(data.audius ?? []);
        setYoutubeHits(data.youtube ?? []);
        setYtStatus(data.youtubeStatus ?? "ok");
        if (data.audiusFailed) setError("Audius did not respond.");
      })
      .catch((e) => {
        // An aborted request is not a failure — a newer search replaced it.
        if (e.name !== "AbortError") setError("Search failed. Try again.");
      })
      .finally(() => setLoading(false));

    // Cancels the previous request when the query changes, so a slow
    // early response cannot overwrite a fast later one.
    return () => controller.abort();
  }, [debounced]);

  /* Trending, for the browse view and the genre buttons. Audius only —
     YouTube has no cheap "what is popular" endpoint. */
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const url = genre
      ? `/api/trending?genre=${encodeURIComponent(genre)}`
      : "/api/trending";

    fetch(url, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setTrending(data.tracks ?? []);
        if (data.error) setError(data.error);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError("Could not load music.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [genre]);

  const searching = debounced.length > 0;

  const activePlaylist =
    view.kind === "playlist" ? playlists.find((p) => p.id === view.id) : null;

  const saved = useMemo(() => {
    if (view.kind === "favorites") {
      return {
        heading: "Favorites",
        subheading: `${favorites.length} saved`,
        tracks: favorites,
        empty: user
          ? "Tap the heart on any song to save it here."
          : "Sign in to save songs to your account.",
      };
    }
    if (view.kind === "playlist") {
      return {
        heading: activePlaylist?.name ?? "Playlist",
        subheading: `${activePlaylist?.tracks.length ?? 0} tracks`,
        tracks: activePlaylist?.tracks ?? [],
        empty: "Empty playlist. Use the + button on a song to add one.",
      };
    }
    return null;
  }, [view, favorites, activePlaylist, user]);

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <Sidebar view={view} onChange={setView} />

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
            <SearchBar value={query} onChange={setQuery} loading={loading} />

            {/* Genre buttons — the "categorize music" feature.
                Audius tags every track with a genre, so this costs nothing. */}
            {!searching && view.kind === "browse" && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setGenre(null)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs transition ${
                    genre === null
                      ? "bg-accent-strong text-bg"
                      : "bg-surface-2 text-muted hover:text-fg"
                  }`}
                >
                  All
                </button>
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGenre(g)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs transition ${
                      genre === g
                        ? "bg-accent-strong text-bg"
                        : "bg-surface-2 text-muted hover:text-fg"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}

            {(error || playbackError) && (
              <p className="mt-4 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted">
                {error ?? playbackError}
              </p>
            )}

            {/* ---------------- search results ---------------- */}
            {searching && (
              <>
                {ytStatus === "quota" && (
                  <p className="mt-4 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted">
                    YouTube&rsquo;s daily search limit is used up — showing
                    Audius results only. It resets at midnight Pacific time.
                  </p>
                )}
                {ytStatus === "disabled" &&
                  process.env.NODE_ENV === "development" && (
                    <p className="mt-4 rounded-lg border border-dashed border-line px-3 py-2 text-sm text-muted">
                      YouTube is off — add <code>YOUTUBE_API_KEY</code> to{" "}
                      <code>.env.local</code> and restart to switch it on.
                    </p>
                  )}

                {youtubeHits.length > 0 && (
                  <section className="mt-6">
                    <header className="mb-2">
                      <h2 className="text-xl font-semibold tracking-tight">
                        Full songs
                      </h2>
                      <p className="text-xs text-muted">
                        From YouTube · plays as video
                      </p>
                    </header>
                    <TrackList tracks={youtubeHits} />
                  </section>
                )}

                <section className="mt-6">
                  <header className="mb-2">
                    <h2 className="text-xl font-semibold tracking-tight">
                      {youtubeHits.length > 0 ? "More from Audius" : "Results"}
                    </h2>
                    <p className="text-xs text-muted">
                      {audiusHits.length} track
                      {audiusHits.length === 1 ? "" : "s"} · independent artists
                    </p>
                  </header>
                  <TrackList
                    tracks={audiusHits}
                    emptyMessage={
                      youtubeHits.length > 0
                        ? "No Audius tracks matched."
                        : "No songs found. Try a different word."
                    }
                  />
                </section>
              </>
            )}

            {/* ---------------- saved views ---------------- */}
            {!searching && saved && (
              <section className="mt-6">
                <header className="mb-2">
                  <h1 className="text-xl font-semibold tracking-tight">
                    {saved.heading}
                  </h1>
                  <p className="text-xs text-muted">{saved.subheading}</p>
                </header>
                <TrackList tracks={saved.tracks} emptyMessage={saved.empty} />
              </section>
            )}

            {/* ---------------- browse ---------------- */}
            {!searching && !saved && (
              <section className="mt-6">
                <header className="mb-2">
                  <h1 className="text-xl font-semibold tracking-tight">
                    {genre ? `Trending in ${genre}` : "Trending this week"}
                  </h1>
                  <p className="text-xs text-muted">
                    Popular on Audius · search to find mainstream songs
                  </p>
                </header>
                <TrackList
                  tracks={trending}
                  emptyMessage="Nothing to show. Audius may be unreachable."
                />
              </section>
            )}

            <p className="py-8 text-center text-[11px] text-muted">
              Audius &amp; YouTube · Space to play · N next · P previous · M mute
            </p>
          </div>
        </main>
      </div>

      <PlayerBar />
      <AuthDialog />
    </div>
  );
}
