# Music Player

A web music player built with Next.js 16, React 19 and TypeScript.

Two music sources behind one set of controls:

- **[Audius](https://audius.co)** — full-length independent tracks. Free, no key, no limit.
- **YouTube** — full-length mainstream music (Hollywood, Bollywood, Lollywood). Needs a free API key.

## Features

- **Search** both sources at once
- **Browse** trending Audius music by genre
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

It runs immediately with Audius only. To switch YouTube on:

```bash
cp .env.example .env.local
```

Then put a YouTube Data API v3 key in `.env.local` and restart. See that
file for where to get one.

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
  layout.tsx                mounts PlayerProvider (owns both players)
  page.tsx                  search, genres, results
  api/search/               queries Audius + YouTube together
  api/trending/             Audius only
components/
  PlayerProvider.tsx        the <audio> element AND the YouTube iframe
  PlayerBar.tsx             transport controls, seek bar, volume
  TrackList.tsx  TrackRow.tsx  SearchBar.tsx  Sidebar.tsx  icons.tsx
lib/
  track.ts                  the shared Track type both sources produce
  engines.ts                one interface, two players
  audius.ts                 Audius client
  youtube.ts                YouTube Data API client
  saves.ts                  favorites + playlists  <- swap for Supabase
  format.ts                 mm:ss and count formatting
store/
  player.ts                 queue, order, volume, repeat
  library.ts                favorites and playlists
```

### Five decisions worth knowing

**One interface, two players.** Audius is an `<audio>` element; YouTube is an
iframe you send commands to. `lib/engines.ts` wraps each in the same seven
methods, so `store/player.ts` picks one by `track.source` and never learns
which kind it got. Your buttons drive both identically.

**Both players live in `layout.tsx`, not in a page.** React never unmounts
the layout, so playback survives every re-render. Put either one inside a
page or a list item and the music stops whenever React re-renders it.

**The YouTube iframe gets a DOM node created outside React.** The IFrame API
*replaces* the element you hand it. If React owned that element, it would
later try to remove a child that no longer exists and throw.

**Unplayable tracks are filtered out.** Audius returns `is_streamable: false`
for deleted artists; YouTube returns `status.embeddable: false` for videos
the owner blocked. Both play silence, so both are dropped before display.
If one slips through anyway, `handleError` skips to the next track.

**Shuffle is a pre-shuffled order, not a random pick per skip.**
Random-on-skip repeats songs you just heard and makes "previous" impossible.

### The YouTube quota

```
Free allowance     10,000 units / day
search.list           100 units      <- expensive
videos.list             1 unit       <- cheap
```

That is about **100 searches per day for all visitors combined**, resetting
at midnight Pacific time. So:

- Every YouTube response is cached for 24 hours — repeating a search is free.
- The search box waits 300 ms after your last keystroke before firing.
- Browse and trending never touch YouTube.
- When the quota runs out the app says so and keeps working on Audius.

The extra 1-unit `videos.list` call is worth it: it buys real durations and
lets us drop videos that cannot be embedded.

## Storage

Favorites and playlists currently live in `localStorage` — this browser
only, no login. All of that is contained in **`lib/saves.ts`**, and every
function there is `async` so the signatures already match a database.

To move to Supabase accounts, rewrite the bodies in that one file. Nothing
else in the app needs to change.

## Deploying

Push to GitHub, import the repo at [vercel.com](https://vercel.com), deploy.

If you are using YouTube, add `YOUTUBE_API_KEY` in the Vercel project
settings — `.env.local` is gitignored and never reaches Vercel.

## Notes

- The YouTube player must stay visible while it plays: YouTube's terms
  require it on screen at 200×200 minimum and forbid audio-only use.
- `next.config.ts` sets `experimental.useTypeScriptCli` because TypeScript 7
  removed the compiler API Next.js used to call.
- Audio streams straight from Audius to the browser, not through the server.
  Proxying audio would burn hosting bandwidth for no benefit.
