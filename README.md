# Music Player

A web music player built with Next.js 16, React 19 and TypeScript.
Music comes from the [Audius](https://audius.co) API — full-length tracks, free, no API key.

## Features

- **Search** any track, artist or mood
- **Browse** trending music, filtered by genre
- **Play / pause / next / previous**, seek, volume, mute
- **Shuffle** and **repeat** (off / all / one)
- **Favorites** and **playlists**
- Keyboard shortcuts and OS media keys

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Play / pause |
| `←` `→` | Seek 5 seconds |
| `↑` `↓` | Volume |
| `M` | Mute |
| `N` / `P` | Next / previous track |

Hardware media keys and the lock screen also work, via the Media Session API.

## How it is put together

```
app/
  layout.tsx                  mounts PlayerProvider (the single <audio>)
  page.tsx                    main screen: search, genres, list
  api/audius/search/          server-side proxy to Audius
  api/audius/trending/
components/
  PlayerProvider.tsx          the one <audio> element + keyboard + media keys
  PlayerBar.tsx               transport controls, seek bar, volume
  TrackList.tsx  TrackRow.tsx
  SearchBar.tsx  Sidebar.tsx  icons.tsx
lib/
  audius.ts                   API client — ~100 Audius fields down to 11
  saves.ts                    favorites + playlists storage  <- swap for Supabase
  format.ts                   mm:ss and play-count formatting
store/
  player.ts                   playback state (queue, order, volume, repeat)
  library.ts                  favorites and playlists state
```

### Three decisions worth knowing

**The `<audio>` element lives in `layout.tsx`, not in a page.**
React never unmounts the layout, so playback survives every re-render.
Put the audio element inside a page or a list item and the music stops
whenever React re-renders it.

**Unplayable tracks are filtered out.**
Audius returns tracks with `is_streamable: false` when the artist has
deleted their account — they play silence. `lib/audius.ts` drops them.
A search for "lofi" returns 30 tracks and 26 survive the filter.

**Shuffle is a pre-shuffled order, not a random pick per skip.**
Random-on-skip repeats songs you just heard and makes "previous"
impossible. `store/player.ts` shuffles the list once and walks it.

## Storage

Favorites and playlists currently live in `localStorage` — this browser
only, no login. All of that is contained in **`lib/saves.ts`**, and every
function there is `async` so the signatures already match a database.

To move to Supabase accounts, rewrite the bodies in that one file. Nothing
else in the app needs to change.

## Deploying

Push to GitHub, import the repo at [vercel.com](https://vercel.com), deploy.
No environment variables are needed yet — Audius requires no key.

## Notes

- `next.config.ts` sets `experimental.useTypeScriptCli` because TypeScript 7
  removed the compiler API Next.js used to call. Remove it if you downgrade
  to TypeScript 6.
- Audio streams straight from Audius to the browser, not through the server.
  Proxying audio would burn hosting bandwidth for no benefit.
