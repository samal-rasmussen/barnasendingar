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

### ESLint caveat

ESLint 9 is installed but the project uses the legacy `.eslintrc.cjs` config format. Running `npx eslint .` directly fails; the `npm run lint` script works because Prettier runs first (and currently exits non-zero before ESLint executes). To run ESLint standalone: `ESLINT_USE_FLAT_CONFIG=false npx eslint .`

### Vendored code

Vendored third-party JS in two locations, excluded from all lint/type checks:

- `src/lib/luxmty-skin/` — Luxmty video player skin (CSS/JS/HTML)
- `src/routes/sending/[showTitle]/partur/[episodeTitle]/quality-selector.js` and `quality-selector/` — HLS quality selector plugin

Exclusions configured in `.prettierignore`, `.eslintrc.cjs` `ignorePatterns`, `tsconfig.json` `exclude`, and `// @ts-nocheck` directives in the vendored JS files. The `// @ts-nocheck` directives are necessary because `tsconfig.json` `exclude` does not apply to files resolved through imports.

### Known pre-existing issues

- `npm run lint` exits non-zero due to Prettier formatting issues in non-vendored files (`.eslintrc.cjs`, `src/app.html`, `vercel.json`, `src/lib/assets/shows.json`).
- `npm run check` reports 3 TS errors in the video player page (`+page.svelte`) for missing type definitions on the Video.js `Player` type (`titleBar`, `hlsQualitySelector`). These do not affect the build or runtime.
- Build produces chunk-size warnings for the bundled `shows.json` data and video player dependencies; informational only.
