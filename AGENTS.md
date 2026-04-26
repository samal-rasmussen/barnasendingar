# AGENTS.md

## Purpose

An alternative frontend for the children's TV catalogue on **kvf.fo** (Kringvarp Føroya, the Faroese public broadcaster). The official site lists every children's show under https://kvf.fo/vit/sjonvarp/sendingar; this project re-presents that catalogue as a kid-friendly grid UI with autoplay and a "watched" indicator, so a child can browse and watch unattended.

The app is now a no-build, vanilla HTML/CSS/JavaScript SPA for Chrome 38-era smart TV browsers. Runtime code must stay framework-free: no modules, no TypeScript syntax, no bundler, no `fetch`, and no modern JavaScript syntax beyond the ES5 baseline documented in `chrome38-features.md`.

The app has three hash-routed views:

1. **Front page (`#/`)** — grid of every show from `public/assets/shows.json`. Each tile shows the show's poster and title; clicking a tile opens that show's page. See `public/js/views/home.js`.
2. **Show page (`#/sending/<showTitle>`)** — grid of every episode for the chosen show, in JSON order. Episodes the user has already finished are marked with a "Sæð" ("watched") overlay; a `Nulstilla "Sæð"` button clears the show's watch history. See `public/js/views/show.js`.
3. **Episode page (`#/sending/<showTitle>/partur/<episodeTitle>`)** — native `<video controls>` playback driven by `hls.js@0.14.17`, with a quality selector outside the native controls. It requests fullscreen, marks the episode watched in `localStorage` when it ends, and advances to the next episode in the show's list. See `public/js/views/episode.js`.

Watched state lives in `localStorage` only (see `public/js/watched.js`); there is no account system or server-side state.

## Runtime Architecture

- Static SPA served directly from `public/`; Vercel is configured with no framework and no build command.
- One global namespace: `window.BS`.
- Hash routes are centralized in `public/js/router.js`.
- Show/episode metadata is loaded with XHR from `public/assets/shows.json`.
- Video playback streams HLS from `vod.kringvarp.fo`; the playlist URL is built from each episode's `mediaId`: `https://vod.kringvarp.fo/redirect/video/_definst_/smil:smil/video/${mediaId}.smil?type=m3u8`.
- Watch history is tracked in browser `localStorage` keyed by `show.title` -> `episode.sortKey`.

## Commands

See `package.json` `scripts`. Key ones:

| Task                    | Command                 |
| ----------------------- | ----------------------- |
| Static dev server       | `npm run serve`         |
| Type check runtime JS   | `npm run check`         |
| Lint and format check   | `npm run lint`          |
| Format                  | `npm run format`        |
| Re-scrape KVF metadata  | `npm run scrape`        |
| Download a show locally | `npm run download-show` |

The scraper and downloader are modern Node/TypeScript tooling under `scripts/`. They have their own `scripts/package.json` and may use modern Node APIs. Runtime browser files under `public/js/` must remain Chrome 38-compatible.

## Compatibility Notes

- Use `var` and `function`.
- Do not use `let`, `const`, arrows, classes, template literals, destructuring, spread, modules, `async`, or `fetch` in runtime files.
- Use `XMLHttpRequest` for browser data loading.
- Use helper functions instead of monkey-patching or polyfilling built-ins.
- Keep `public/css/grid.css` separate.
- CSS must avoid Grid, custom properties, flex `gap`, `aspect-ratio`, `place-items`, and `color-scheme`.
- `public/js/vendor/hls.light.min.js` is vendored third-party code and excluded from lint/type checks.

## Deployment

`vercel.json` serves `public/` directly and rewrites unknown paths to `/index.html`. Normal app navigation uses hash routes, so deep links are client-side hashes and do not require server-side route handling.
