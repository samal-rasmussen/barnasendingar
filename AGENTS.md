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
- Modern desktop browsers will happily run code the TV can't. "Works in my browser" proves nothing about the TV. Rely on the rules below, on ESLint (it parses the runtime JS as ES5), and on checking against the feature doc.
- The TV is driven with a remote, not a mouse. Interactive elements need to be focusable and work with Enter/OK (see `BS.util.onActivate`). Give focus to the main action where it helps, for example the retry button on the load-error screen.

Runtime code rules:

- Use `var` and `function`.
- Do not use `let`, `const`, arrows, classes, template literals, destructuring, spread, default/rest parameters, modules, `async`/`await`, or `fetch`.
- Do not use post-ES5 built-ins such as `String.prototype.includes`/`startsWith`, `Array.prototype.find`/`includes`, `Array.from` or `Object.assign`.
- Use `XMLHttpRequest` for loading data.
- Use helper functions instead of monkey-patching or polyfilling built-ins.
- Do not use Web Components in any form: no custom elements (`customElements.define`, `document.registerElement`), no Shadow DOM (`attachShadow`, `createShadowRoot`) and no HTML Imports, and no libraries built on them. The TV lacks the v1 APIs and the v0 ones are unreliable. Reusable UI pieces are plain ES5 functions that we write ourselves, built from ordinary elements and `<template>`.
- CSS must avoid Grid, custom properties, flex `gap`, `aspect-ratio`, `position: sticky`, `place-items`, `color-scheme` and `:is()`/`:where()`/`:has()`. Flexbox is fine.
- Keep `public/core/grid.css` as its own file.
- `public/vendor/hls.light.min.js` (hls.js 0.14.17, chosen to fit this browser) is vendored third-party code. Lint and type checks skip it.

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

- Code is grouped by page. Shared code lives in `public/core/`. Each page has its own folder under `public/pages/<page>/` holding that page's `.js`, its `.html` templates and, if it has page-specific styles, its `.css`.
- There are no imports, because the TV has no ES modules. `public/index.html` loads every stylesheet with `<link>` and every script with plain `<script>` tags in order: `vendor/hls.light.min.js`, then `core/` (`app.js`, `util.js`, `data.js`, `watched.js`, `templates.js`, `router.js`), then each page's `.js`. It then calls `window.BS.start()`. A new page needs its `<script>` (and `<link>`, if it has CSS) added there.
- There is one global namespace, `window.BS`. Each page registers itself as `BS.pages.<name>` with a `render(root, ...)` function. `render` may return a cleanup function that the router calls when leaving the page.
- **Page HTML** lives in `<template id="...">` elements in the page's `.html` file. Each page script calls `BS.templates.register('/pages/<page>/<page>.html')`. At startup, `BS.templates.load` (`public/core/templates.js`) fetches every registered file with XHR. Pages then call `BS.templates.clone(id)`, which returns `{ fragment, element, refs }`; `refs` maps each element's `data-ref` attribute value to the element. Template ids are global, so prefix them with the page name. Keep structure and static text in the HTML, and use JS only for data, event handlers and showing/hiding parts.
- At startup, show and episode metadata is loaded with XHR from `/assets/shows.json`, in parallel with the templates. Both loads have timeouts (`BS.data.loadShowsTimeoutMs`, `BS.templates.loadTimeoutMs`). If either fails, an error screen with a "Royn aftur" (retry) button appears. That screen is built in code in `core/app.js`, since it must work without templates.
- Hash routes are handled in `public/core/router.js`.
- Video plays as HLS from `vod.kringvarp.fo`. The playlist URL is built from each episode's `mediaId`: `https://vod.kringvarp.fo/redirect/video/_definst_/smil:smil/video/${mediaId}.smil?type=m3u8`.
- Watch history is stored only in the browser's `localStorage`, under the key `watched`, in the shape `{ [showTitle]: { [episodeSortKey]: true } }` (see `public/core/watched.js`). There are no accounts and no server-side state.

The app has three main pages, plus a not-found page (`public/pages/not-found/`):

1. **Front page (`#/`):** a grid of every show in `shows.json`, each with its poster and title. Selecting a tile opens the show. See `public/pages/home/`.
2. **Show page (`#/sending/<showTitle>`):** a grid of the show's episodes in JSON order. Finished episodes get a "Sæð" ("watched") overlay. A `Nulstilla "Sæð"` button clears the show's watch history. See `public/pages/show/`.
3. **Episode page (`#/sending/<showTitle>/partur/<episodeTitle>`):** native `<video controls>` driven by hls.js, with a quality selector outside the native controls. It requests fullscreen, marks the episode watched when it ends, and moves on to the next episode. See `public/pages/episode/`.

UI text is in Faroese. Keep new UI strings in Faroese.

## Repository Layout

| Path                             | What it is                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `public/`                        | The deployed site. Everything here is served exactly as committed.             |
| `public/assets/shows.json`       | Scraped catalogue. Generated by the scraper and committed.                     |
| `public/core/`                   | Shared runtime code and CSS (bootstrap, router, data, templates, base styles). |
| `public/pages/<page>/`           | One folder per page with its JS, HTML templates and CSS.                       |
| `public/vendor/`                 | Vendored third-party code (hls.js). Not linted or type-checked.                |
| `scripts/`                       | Modern Node/TypeScript tooling with its own `package.json`.                    |
| `scripts/scrape.ts`              | KVF metadata scraper that writes `public/assets/shows.json`.                   |
| `scripts/delete_duplicates.ts`   | Removes duplicate episodes (by `sortKey`) from the scraped JSON.               |
| `scripts/download-show.ts`       | Interactive downloader for saving a show locally through `yt-dlp`.             |
| `scripts/keepawake.ts`           | Cross-platform wake-lock helper used by `download-show.ts`.                    |
| `scripts/shared-types.d.ts`      | Shared `Show` and `Episode` types, used by both the scripts and runtime JSDoc. |
| `docs/`                          | Project documentation. See [Documentation](#documentation).                    |
| `tests/`, `playwright.config.ts` | Playwright browser tests. Dev-only, not deployed.                              |
| `vercel.json`                    | Vercel static deployment config.                                               |

`dist/`, `.svelte-kit/` and `downloads/` are git-ignored leftovers or local output and can be ignored.

## Working In This Project

### Setup

- Node 22 or newer (the scripts use `node --run`).
- Run `npm install` in the repo root (lint and type-check tools) and in `scripts/` (scraper dependencies).
- `yt-dlp` on `PATH` is only needed for `download-show`.

### Commands

Run package scripts with `node --run <script>`, not `npm run`.

Root `package.json`:

| Script              | Command                                      | Description                                                                             |
| ------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `serve`             | `sirv public --dev --single --port 4387`     | Serves `public/` locally on port 4387. `--dev` picks up new files and disables caching. |
| `check`             | `tsc --noEmit`                               | Type-checks the runtime JavaScript in `public/` through JSDoc.                          |
| `test`              | `playwright test`                            | Runs the browser tests in `tests/` against a server it starts on port 4388.             |
| `lint`              | `prettier --check . && eslint .`             | Checks formatting and lints. ESLint parses runtime JS as ES5.                           |
| `format`            | `prettier --write .`                         | Formats the repo. Use it on purpose, because it rewrites many files.                    |
| `scrape`            | `npm --prefix scripts run scrape`            | Scrapes KVF and refreshes `public/assets/shows.json`.                                   |
| `delete-duplicates` | `npm --prefix scripts run delete-duplicates` | Runs only the duplicate cleanup step.                                                   |
| `download-show`     | `npm --prefix scripts run download-show`     | Runs the interactive local show downloader.                                             |

`scripts/package.json`:

| Script              | Command                                        | Description                                                            |
| ------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| `scrape`            | `tsx ./scrape.ts && npm run delete-duplicates` | Scrapes show and episode metadata, then removes duplicate episodes.    |
| `delete-duplicates` | `tsx ./delete_duplicates.ts`                   | Removes duplicate episodes in `public/assets/shows.json` by `sortKey`. |
| `download-show`     | `tsx ./download-show.ts`                       | Interactively downloads a selected show through `yt-dlp`.              |
| `check`             | `tsc --noEmit -p tsconfig.json`                | Type-checks the Node/TypeScript tooling.                               |

### Dev Environment

There is no build, bundler, dev server with hot reload, or watch mode. The files in `public/` are the site.

- Start a static server with `node --run serve` and open http://localhost:4387. Edit or add a file under `public/` and reload the page to see the change. There is no live reload, but the server never needs a restart: `--dev` makes sirv read files from disk on every request and send `Cache-Control: no-store`. Without `--dev`, files created after startup return 404.
- Run long-lived servers in the background and stop them when you're done, so they don't hold the port.
- The local site uses the real `public/assets/shows.json`, real KVF poster images and real video from `vod.kringvarp.fo`. Playback needs internet access, but no keys or accounts.
- Any page can be opened directly through its hash route, for example `http://localhost:4387/#/sending/<showTitle>` with the title URL-encoded. An unknown route shows the not-found page.
- Watch history is in `localStorage` under `watched`. Clear it in devtools, or with the page's `Nulstilla "Sæð"` button, to reset state between tests.
- To see the load-error screen and the "Royn aftur" button, block `/assets/shows.json` or one of the `pages/*/*.html` files in devtools (Network → Block request URL) and reload.

### Checks

Before handing off a runtime change:

1. Run `node --run check` (type check), `node --run lint` (Prettier + ESLint) and `node --run test` (browser tests). For a quicker pass, run `npx eslint .` and `npx prettier --check <changed files>`. Format changed files with `npx prettier --write <files>`, not `node --run format`, which rewrites the whole repo.
2. Re-read the change against [`docs/chrome38-features.md`](docs/chrome38-features.md). ESLint only catches post-ES5 **syntax**. It does not catch post-ES5 built-in methods, newer DOM APIs or unsupported CSS, so check those by hand.
3. Run the site and go through every affected page in a browser (see below). Watch the console for errors.
4. If possible, check the change on the TV itself (see below).

For changes to `scripts/`, run `npm --prefix scripts run check`.

### Testing In A Browser

A desktop browser can show that the logic, layout and flows work. It can't show that the code runs on the TV.

- **By hand:** click through the affected pages. Also drive them with the keyboard only (Tab, Enter and the arrow keys), because the TV remote behaves like that, and make sure focus is visible and that Enter activates tiles and buttons.
- **Automated:** `node --run test` runs the Playwright tests in `tests/` (config in `playwright.config.ts`). It starts its own static server on port 4388. The first time, install the browser with `npx playwright install chromium`. The tests run in modern headless Chromium, so they check behaviour, not Chrome 38 compatibility.
- **Regression check for refactors:** export the last commit with `git archive HEAD public | tar -x -C <tmp dir>` (read-only, it doesn't touch the worktree), serve it on a second port, and compare screenshots of old and new at the same routes and widths. If a change isn't supposed to look different, the screenshots should match pixel for pixel.

### Testing On The TV

The real target is the LG TV, which acts like Chrome 38. To test there, the user pushes a branch and opens the Vercel preview deployment URL in the TV's browser. Agents can't do this. When a change carries real compatibility risk (new DOM APIs, CSS or video/fullscreen behaviour), say so and ask the user to check it on the TV.

### Common Tasks

- **Refresh the catalogue:** run `node --run scrape`. It fetches every children's show and episode from kvf.fo, which takes a while and makes many requests, then removes duplicates and rewrites `public/assets/shows.json`. Look over the diff of that file to check it is sensible before the user commits it.
- **Change a page:** edit the files in `public/pages/<page>/`. Markup goes in the `.html` templates, behaviour in the `.js` and page-only styles in the `.css`. Styles shared by more than one page go in `public/core/`.
- **Add a page:** create `public/pages/<page>/` with `<page>.html` (templates with ids prefixed by the page name) and `<page>.js`, which defines `BS.pages.<name>` and calls `BS.templates.register(...)`. Add its `<script>` (and `<link>`, if it has CSS) to `public/index.html`, then add a route in `public/core/router.js`.
- **Download a show for offline use:** run `node --run download-show`. It is interactive and needs `yt-dlp`. Files go to `downloads/`, which is git-ignored.

### Git Policy

Git belongs to the user. The user alone maintains the repository, the index and the worktree's git state. Agents must not meddle with it.

- Agents may run **read-only** git commands only, for example `git status`, `git diff`, `git diff --cached`, `git log`, `git show`, `git blame` and `git branch --show-current`.
- Agents must **never** run a git command that writes or changes anything. That includes staging and unstaging (`git add`, `git rm`, `git mv`, `git restore`), committing, amending, switching or creating branches, resetting, checking out files, stashing, merging, rebasing, cherry-picking, tagging, cleaning, changing config, creating worktrees, fetching, pulling and pushing. Pushing to `master` deploys to production.
- To move or delete files, use plain filesystem commands (`mv`, `rm`), not their git equivalents.
- Expect the user to stage and unstage files while you work. Changes in `git status` or `git diff --cached` that you didn't make are normal. Don't treat them as a problem, don't try to undo them, and don't report them as surprising.

## Documentation

All project documentation lives in [`docs/`](docs/). Add new docs there and link them here.

| Document                                                                   | What it covers                                                                                                                                  |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/chrome38-features.md`](docs/chrome38-features.md)                   | Which JavaScript, HTML and CSS features the TV's Chrome 38-era browser supports. Read before writing runtime code.                              |
| [`docs/vanilla-spa-migration-plan.md`](docs/vanilla-spa-migration-plan.md) | Historical, already implemented plan for replacing the original SvelteKit app with the current vanilla SPA. Background on the design decisions. |
