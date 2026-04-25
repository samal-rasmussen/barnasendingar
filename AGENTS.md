# AGENTS.md

## Purpose

An alternative frontend for the children's TV catalogue on **kvf.fo** (Kringvarp Føroya, the Faroese public broadcaster). The official site lists every children's show under https://kvf.fo/vit/sjonvarp/sendingar; this project re-presents that catalogue as a kid-friendly grid UI with autoplay and a "watched" indicator, so a child can browse and watch unattended.

The app has three pages, in this user flow:

1. **Front page (`/`)** — grid of every show from the pre-scraped `src/lib/assets/shows.json` (~55 shows). Each tile shows the show's poster and title; clicking a tile opens that show's page. See `src/routes/+page.svelte`.
2. **Show page (`/sending/[showTitle]`)** — grid of every episode for the chosen show, sorted by date. Episodes the user has already finished are marked with a "Sæð" ("watched") overlay; a "Nulstilla 'Sæð'" button clears the show's watch history. Clicking an episode opens the player. See `src/routes/sending/[showTitle]/+page.svelte`.
3. **Episode page (`/sending/[showTitle]/partur/[episodeTitle]`)** — a Video.js player that streams HLS from `vod.kringvarp.fo` for the episode's `mediaId`. It requests fullscreen on mount, marks the episode watched in `localStorage` when it ends, and auto-advances to the next episode in the show's list. See `src/routes/sending/[showTitle]/partur/[episodeTitle]/+page.svelte`.

Watched state lives in `localStorage` only (see `src/lib/watched.ts`); there is no account system or server-side state.

## Cursor Cloud specific instructions

**SvelteKit 2 / Svelte 5** static SPA. No backend, no database, no Docker. Uses `npm` as the package manager (see `package-lock.json`).

### Architecture

- Static SPA built with `@sveltejs/adapter-static`; output goes to `dist/`. SSR is disabled.
- Show/episode metadata is pre-bundled in `src/lib/assets/shows.json` (scraped from `kvf.fo` via `npm run scrape`, but scraping is not needed to develop or run the app).
- Video playback streams HLS from `vod.kringvarp.fo` (external server); requires network access. The playlist URL is built from each episode's `mediaId`: `https://vod.kringvarp.fo/redirect/video/_definst_/smil:smil/video/${mediaId}.smil?type=m3u8`.
- Watch history is tracked in browser `localStorage` keyed by `show.title` → `episode.sortKey` (see `src/lib/watched.ts`).

### Routes

| Route                                        | File                                                                | Description                             |
| -------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------- |
| `/`                                          | `src/routes/+page.svelte`                                           | Show grid (homepage)                    |
| `/sending/[showTitle]`                       | `src/routes/sending/[showTitle]/+page.svelte`                       | Episode list for a show                 |
| `/sending/[showTitle]/partur/[episodeTitle]` | `src/routes/sending/[showTitle]/partur/[episodeTitle]/+page.svelte` | Video player with autoplay-next-episode |

### Commands

See `package.json` `scripts`. Key ones:

| Task                     | Command                   |
| ------------------------ | ------------------------- |
| Dev server               | `npm run dev` (port 5173) |
| Build                    | `npm run build`           |
| Lint (Prettier + ESLint) | `npm run lint`            |
| Type check               | `npm run check`           |
| Format                   | `npm run format`          |
| Re-scrape KVF metadata   | `npm run scrape`          |
| Download a show locally  | `npm run download-show`   |

`scripts/` also contains `keepawake.ts` (a cross-platform wake-lock helper imported by `download-show.ts`) and `delete_duplicates.ts` (run automatically at the end of `npm run scrape`).

### Deployment

`vercel.json` configures Vercel to rewrite all paths to `/` so the static SPA's client-side router handles deep links (`adapter-static` is configured with `fallback: 'index.html'` in `svelte.config.js`).

### ESLint config

ESLint 9 flat config in `eslint.config.js`. `npx eslint .` works directly; no legacy `.eslintrc` file is used.

### Vendored code

Vendored third-party JS in two locations, excluded from all lint/type checks:

- `src/lib/luxmty-skin/` — Luxmty video player skin (CSS/JS/HTML), plus the original `videojsluxmtyplayerskin.zip`
- `src/routes/sending/[showTitle]/partur/[episodeTitle]/quality-selector.js` and `quality-selector/` — HLS quality selector plugin

Exclusions configured in `.prettierignore`, `eslint.config.js` (`ignores`), `tsconfig.json` `exclude`, and `// @ts-nocheck` directives in the vendored JS files. The `// @ts-nocheck` directives are necessary because `tsconfig.json` `exclude` does not apply to files resolved through imports.

### Known pre-existing issues

- `npm run lint` exits non-zero because Prettier flags `src/lib/assets/shows.json` as not formatted. ESLint itself passes.
- `npm run check` reports 7 TS errors: 2 in the video player page for missing Video.js `Player` type members (`titleBar`, `hlsQualitySelector`), plus 5 in the route pages for `undefined` index/parameter types. None affect the build or runtime.
- Build produces chunk-size warnings for the bundled `shows.json` data and video player dependencies; informational only.
