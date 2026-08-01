"use client";

import { useEffect, useMemo, useState } from "react";
import type { Track } from "@/lib/audius";
import { GENRES } from "@/lib/audius";
import { useLibrary } from "@/store/library";
import Sidebar, { type View } from "@/components/Sidebar";
import SearchBar from "@/components/SearchBar";
import TrackList from "@/components/TrackList";
import PlayerBar from "@/components/PlayerBar";

export default function Home() {
  const [view, setView] = useState<View>({ kind: "browse" });

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [genre, setGenre] = useState<string | null>(null);

  const [results, setResults] = useState<Track[]>([]);
  const [trending, setTrending] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLibrary = useLibrary((s) => s.load);
  const favorites = useLibrary((s) => s.favorites);
  const playlists = useLibrary((s) => s.playlists);

  /* Read saved favorites and playlists once, after the page mounts.
     It has to be after mount because localStorage does not exist on the
     server, and reading it during render would break hydration. */
  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  /* Wait 300ms after the last keystroke before searching.
     Without this, typing "lofi" fires four separate requests. */
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  /* Search. */
  useEffect(() => {
    if (!debounced) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/audius/search?q=${encodeURIComponent(debounced)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        setResults(data.tracks ?? []);
        if (data.error) setError(data.error);
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

  /* Trending, for the browse view and the genre buttons. */
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const url = genre
      ? `/api/audius/trending?genre=${encodeURIComponent(genre)}`
      : "/api/audius/trending";

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

  const { heading, subheading, tracks, empty } = useMemo(() => {
    if (searching) {
      return {
        heading: `Results for “${debounced}”`,
        subheading: `${results.length} track${results.length === 1 ? "" : "s"}`,
        tracks: results,
        empty: "No songs found. Try a different word.",
      };
    }

    if (view.kind === "favorites") {
      return {
        heading: "Favorites",
        subheading: `${favorites.length} saved`,
        tracks: favorites,
        empty: "Tap the heart on any song to save it here.",
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

    return {
      heading: genre ? `Trending in ${genre}` : "Trending this week",
      subheading: "Popular on Audius right now",
      tracks: trending,
      empty: "Nothing to show. Audius may be unreachable.",
    };
  }, [
    searching,
    debounced,
    results,
    view,
    favorites,
    activePlaylist,
    genre,
    trending,
  ]);

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

            <header className="mb-2 mt-6">
              <h1 className="text-xl font-semibold tracking-tight">{heading}</h1>
              <p className="text-xs text-muted">{subheading}</p>
            </header>

            {error && (
              <p className="mb-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted">
                {error}
              </p>
            )}

            <TrackList tracks={tracks} emptyMessage={empty} />

            <p className="py-8 text-center text-[11px] text-muted">
              Music from Audius · Space to play · N next · P previous · M mute
            </p>
          </div>
        </main>
      </div>

      <PlayerBar />
    </div>
  );
}
