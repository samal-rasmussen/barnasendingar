# AGENTS.md

## Cursor Cloud specific instructions

This is a **SvelteKit 2 / Svelte 5** static SPA for streaming Faroese children's TV shows (KVF Barnasendingar). No backend, no database, no Docker.

### Running the app

- `npm run dev` starts the Vite dev server on port 5173.
- Show/episode data is pre-bundled in `src/lib/assets/shows.json`; no scraping needed to run locally.
- Video playback streams from `vod.kringvarp.fo` (external); requires network access.

### Key commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Type check | `npm run check` |
| Format | `npm run format` |

### Vendored code

Vendored third-party JS lives in two locations and is excluded from lint/type checks:
- `src/lib/luxmty-skin/` — video player skin (CSS/JS/HTML)
- `src/routes/sending/[showTitle]/partur/[episodeTitle]/quality-selector.js` and `quality-selector/` — HLS quality selector plugin

These are ignored via `.prettierignore`, `.eslintrc.cjs` `ignorePatterns`, `tsconfig.json` `exclude`, and `// @ts-nocheck` directives.

### Known pre-existing issues

- `npm run lint` exits non-zero due to pre-existing Prettier formatting issues in non-vendored files (e.g. `.eslintrc.cjs`, `src/app.html`, `vercel.json`).
- `npm run check` reports 3 TS errors in `+page.svelte` (video player page) for missing type definitions on the Video.js `Player` type. These are pre-existing and do not affect the build or runtime.
- The build produces chunk-size warnings for `shows.json` and the video player node; these are informational only.
