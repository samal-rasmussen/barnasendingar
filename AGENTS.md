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

### Known pre-existing issues

- `npm run lint` exits non-zero due to pre-existing Prettier formatting issues in vendored files and config.
- `npm run check` reports ~128 TS errors, almost all from vendored JS files (`quality-selector.js`, `plugin.js`) and a few in Svelte components. These are pre-existing and do not affect the build or runtime.
- The build produces chunk-size warnings for `shows.json` and the video player node; these are informational only.
