# AGENTS.md

## Purpose

This is a custom frontend for the children's TV content of **kvf.fo** (Kringvarp Føroya, the public broadcaster of the Faroe Islands). It is built for one specific client: **an old LG smart TV** in the household that owns this project.

The official kvf.fo site does not work on that TV. Its built-in browser renders the site badly, so much of the children's content can't be reached or played. This project gets around that:

1. A **scraper** (`scripts/scrape.ts`) collects every children's show and episode from https://kvf.fo/vit/sjonvarp/sendingar and saves the metadata to `public/assets/shows.json`.
2. A **small static website** shows that catalogue as a kid-friendly grid. It plays episodes directly from KVF's own video servers, with autoplay of the next episode and a "watched" marker, so a child can browse and watch on the TV unattended.

The site is live at **https://barnasendingar.vercel.app**. Videos are not rehosted; only the metadata is scraped.

## Target Environment: The TV Browser

**The LG TV's browser is roughly Chrome 38 (October 2014).** It is the most important constraint in the project. Everything under `public/` must run on it.

- Read [`docs/chrome38-features.md`](docs/chrome38-features.md) before writing or reviewing runtime code. It lists which JavaScript, HTML and CSS features are and aren't available.
- Modern desktop browsers will happily run code the TV can't. "Works in my browser" proves nothing about the TV. Rely on the rules below, on ESLint (it parses `public/js` as ES5), and on checking against the feature doc.
- The TV is driven with a remote, not a mouse. Interactive elements need to be focusable and work with Enter/OK (see `BS.util.onActivate`). Give focus to the main action where it helps, for example the retry button on the load-error screen.

Runtime code rules:

- Use `var` and `function`.
- Do not use `let`, `const`, arrows, classes, template literals, destructuring, spread, default/rest parameters, modules, `async`/`await`, or `fetch`.
- Do not use post-ES5 built-ins such as `String.prototype.includes`/`startsWith`, `Array.prototype.find`/`includes`, `Array.from` or `Object.assign`.
- Use `XMLHttpRequest` for loading data.
- Use helper functions instead of monkey-patching or polyfilling built-ins.
- CSS must avoid Grid, custom properties, flex `gap`, `aspect-ratio`, `position: sticky`, `place-items`, `color-scheme` and `:is()`/`:where()`/`:has()`. Flexbox is fine.
- Keep `public/css/grid.css` as its own file.
- `public/js/vendor/hls.light.min.js` (hls.js 0.14.17, chosen to fit this browser) is vendored third-party code. Lint and type checks skip it.

The scraper and other tools under `scripts/` run on the developer's machine with modern Node. They are **not** bound by these rules.

## Production And Deployment

- **Production URL:** https://barnasendingar.vercel.app
- **Host:** Vercel, connected to the GitHub repo through Vercel's Git integration. There is no `.vercel/` link in the repo and no Vercel CLI workflow.
- **Normal flow:** pushing to `master` deploys to production automatically. Other branches get Vercel preview deployments (Vercel's default behaviour).
- **Current state (November 2026):** the `vanilla-spa-rewrite` branch was promoted to production by hand in the Vercel dashboard, overriding `master`. Once that branch is merged, `master` becomes the production source again. Until then, keep in mind that production reflects this branch, not `master`.
- **Build:** none. `vercel.json` sets `framework: null` and `buildCommand: null`, serves the committed `public/` directory as-is, and rewrites unknown paths to `/index.html`. App navigation uses hash routes, so deep links never need server-side handling.
- **Updating content:** run the scraper, commit the updated `public/assets/shows.json`, and push. No other step is needed.

## Runtime Architecture

The app is a no-build, framework-free single-page app served from `public/`.

- `public/index.html` loads plain `<script>` tags in order: vendor hls.js, `app.js`, `util.js`, `data.js`, `watched.js`, `router.js`, then the views. It then calls `window.BS.start()`.
- There is one global namespace, `window.BS`.
- Show and episode metadata is loaded with XHR from `/assets/shows.json`. The load has a timeout (`BS.data.loadShowsTimeoutMs`). If it fails, an error screen with a "Royn aftur" (retry) button appears.
- Hash routes are handled in `public/js/router.js`.
- Video plays as HLS from `vod.kringvarp.fo`. The playlist URL is built from each episode's `mediaId`: `https://vod.kringvarp.fo/redirect/video/_definst_/smil:smil/video/${mediaId}.smil?type=m3u8`.
- Watch history is stored only in the browser's `localStorage`, under the key `watched`, in the shape `{ [showTitle]: { [episodeSortKey]: true } }` (see `public/js/watched.js`). There are no accounts and no server-side state.

The app has three views:

1. **Front page (`#/`):** a grid of every show in `shows.json`, each with its poster and title. Selecting a tile opens the show. See `public/js/views/home.js`.
2. **Show page (`#/sending/<showTitle>`):** a grid of the show's episodes in JSON order. Finished episodes get a "Sæð" ("watched") overlay. A `Nulstilla "Sæð"` button clears the show's watch history. See `public/js/views/show.js`.
3. **Episode page (`#/sending/<showTitle>/partur/<episodeTitle>`):** native `<video controls>` driven by hls.js, with a quality selector outside the native controls. It requests fullscreen, marks the episode watched when it ends, and moves on to the next episode. See `public/js/views/episode.js`.

UI text is in Faroese. Keep new UI strings in Faroese.

## Repository Layout

| Path                           | What it is                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `public/`                      | The deployed site. Everything here is served exactly as committed.             |
| `public/assets/shows.json`     | Scraped catalogue. Generated by the scraper and committed.                     |
| `public/js/`, `public/css/`    | Runtime app code. Must be Chrome 38-compatible.                                |
| `scripts/`                     | Modern Node/TypeScript tooling with its own `package.json`.                    |
| `scripts/scrape.ts`            | KVF metadata scraper that writes `public/assets/shows.json`.                   |
| `scripts/delete_duplicates.ts` | Removes duplicate episodes (by `sortKey`) from the scraped JSON.               |
| `scripts/download-show.ts`     | Interactive downloader for saving a show locally through `yt-dlp`.             |
| `scripts/keepawake.ts`         | Cross-platform wake-lock helper used by `download-show.ts`.                    |
| `scripts/shared-types.d.ts`    | Shared `Show` and `Episode` types, used by both the scripts and runtime JSDoc. |
| `docs/`                        | Project documentation. See [Documentation](#documentation).                    |
| `vercel.json`                  | Vercel static deployment config.                                               |

`dist/`, `.svelte-kit/` and `downloads/` are git-ignored leftovers or local output and can be ignored.

## Working In This Project

### Setup

- Node 22 or newer (the scripts use `node --run`).
- Run `npm install` in the repo root (lint and type-check tools) and in `scripts/` (scraper dependencies).
- `yt-dlp` on `PATH` is only needed for `download-show`.

### Commands

Run package scripts with `node --run <script>`, not `npm run`.

Root `package.json`:

| Script              | Command                                      | Description                                                          |
| ------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| `serve`             | `npx sirv-cli public --single --port 5173`   | Serves `public/` locally on port 5173.                               |
| `check`             | `tsc --noEmit`                               | Type-checks the runtime JavaScript in `public/js/` through JSDoc.    |
| `lint`              | `prettier --check . && eslint .`             | Checks formatting and lints. ESLint parses `public/js` as ES5.       |
| `format`            | `prettier --write .`                         | Formats the repo. Use it on purpose, because it rewrites many files. |
| `scrape`            | `npm --prefix scripts run scrape`            | Scrapes KVF and refreshes `public/assets/shows.json`.                |
| `delete-duplicates` | `npm --prefix scripts run delete-duplicates` | Runs only the duplicate cleanup step.                                |
| `download-show`     | `npm --prefix scripts run download-show`     | Runs the interactive local show downloader.                          |

`scripts/package.json`:

| Script              | Command                                        | Description                                                            |
| ------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| `scrape`            | `tsx ./scrape.ts && npm run delete-duplicates` | Scrapes show and episode metadata, then removes duplicate episodes.    |
| `delete-duplicates` | `tsx ./delete_duplicates.ts`                   | Removes duplicate episodes in `public/assets/shows.json` by `sortKey`. |
| `download-show`     | `tsx ./download-show.ts`                       | Interactively downloads a selected show through `yt-dlp`.              |
| `check`             | `tsc --noEmit -p tsconfig.json`                | Type-checks the Node/TypeScript tooling.                               |

### Making And Verifying Changes

There is no automated test suite. Before handing off a runtime change:

1. Run `node --run check` and `node --run lint` (or at least `npx eslint public/js` and `npx prettier --check` on the changed files).
2. Re-read the change against [`docs/chrome38-features.md`](docs/chrome38-features.md). Pay extra attention to built-in methods and CSS properties, which ESLint does not catch.
3. Run `node --run serve` and click through the affected views in a browser. If port 5173 is already taken by another dev server, the page loads the wrong files. Pick another port with `npx sirv-cli public --single --port <port>`.
4. If possible, check the change on the TV itself through a Vercel preview deployment.

### Git Policy

In local desktop/workspace environments, do not run git commands that change state unless the user explicitly asks for that exact git action. Read-only git commands are fine for inspection, for example `git status`, `git diff`, `git log`, `git show` and `git branch --show-current`.

State-changing git actions include staging, committing, switching or creating branches, resetting, checking out files, stashing, merging, rebasing, tagging, pulling and pushing. Remember that pushing to `master` deploys to production. These actions may be used in a cloud environment when that workflow requires them, but do not assume they are acceptable in the local workspace.

## Documentation

All project documentation lives in [`docs/`](docs/). Add new docs there and link them here.

| Document                                                                   | What it covers                                                                                                                                  |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/chrome38-features.md`](docs/chrome38-features.md)                   | Which JavaScript, HTML and CSS features the TV's Chrome 38-era browser supports. Read before writing runtime code.                              |
| [`docs/vanilla-spa-migration-plan.md`](docs/vanilla-spa-migration-plan.md) | Historical, already implemented plan for replacing the original SvelteKit app with the current vanilla SPA. Background on the design decisions. |
