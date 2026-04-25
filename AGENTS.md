# AGENTS.md

## Cursor Cloud specific instructions

**SvelteKit 2 / Svelte 5** static SPA for streaming Faroese children's TV shows from KVF (Kringvarp Føroya). No backend, no database, no Docker. Uses `npm` as the package manager (see `package-lock.json`).

### Architecture

- Static SPA built with `@sveltejs/adapter-static`; output goes to `dist/`. SSR is disabled.
- Show/episode metadata is pre-bundled in `src/lib/assets/shows.json` (scraped from `kvf.fo` via `npm run scrape`, but scraping is not needed to develop or run the app).
- Video playback streams HLS from `vod.kringvarp.fo` (external server); requires network access.
- Watch history is tracked in browser `localStorage` (see `src/lib/watched.ts`).

### Routes

| Route                                        | File                                                                | Description             |
| -------------------------------------------- | ------------------------------------------------------------------- | ----------------------- |
| `/`                                          | `src/routes/+page.svelte`                                           | Show grid (homepage)    |
| `/sending/[showTitle]`                       | `src/routes/sending/[showTitle]/+page.svelte`                       | Episode list for a show |
| `/sending/[showTitle]/partur/[episodeTitle]` | `src/routes/sending/[showTitle]/partur/[episodeTitle]/+page.svelte` | Video player            |

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
