# AGENTS.md

## Purpose

This is a custom frontend for the children's TV content of **kvf.fo** (Kringvarp Føroya, the public broadcaster of the Faroe Islands). It is built for one specific client: **an old LG smart TV** in the household that owns this project.

The official kvf.fo site does not work on that TV. Its built-in browser renders the site badly, so much of the children's content can't be reached or played. This project gets around that:

1. A **scraper** (`scripts/scrape.ts`) collects every children's show and episode from https://kvf.fo/vit/sjonvarp/sendingar and saves the metadata to `public/assets/shows.json`.
2. A **small static website** shows that catalogue as a kid-friendly grid. It plays episodes directly from KVF's own video servers, with autoplay of the next episode and a "watched" marker, so a child can browse and watch on the TV unattended.

The site is live at **https://barnasendingar.vercel.app**. Videos are not rehosted; only the metadata is scraped.

## Invariant: No Build Step

**Nothing in this project is ever built.** The files in `public/` are the site, served exactly as committed. There is no bundler, transpiler, minifier, compile step, code generator or post-processing of any kind between the repo and what the TV runs, and there never will be.

- The site must work straight from a checkout, with nothing installed and no command run. `node --run serve` is only a convenience for serving the folder.
- The tooling (formatter, linter, type checker, tests) consists of **checks**, not build steps. They read the code and report on it. Nothing they produce is deployed or needed at runtime, and they are optional value on top: if every tool vanished, the site would still deploy and run unchanged.
- Don't add anything the site would depend on that has to be generated: no compiled CSS, no bundles, no generated JS or HTML. Runtime code is written by hand as it will run, in ES5 for the TV.
- `public/assets/shows.json` is data, not build output. The scraper refreshes it on demand, and it is committed like any other file.
- The scripts under `scripts/` are developer tools run with modern Node. They don't build the site either.

## Target Environment: The TV Browser

**The LG TV's browser is roughly Chrome 38 (October 2014).** It is the most important constraint in the project. Everything under `public/` must run on it.

- Read [`docs/component-model.md`](docs/component-model.md) before adding or changing a component or page. It describes how components and pages are built, loaded and put together.
- Read [`docs/chrome38-features.md`](docs/chrome38-features.md) before writing or reviewing runtime code. It lists which JavaScript, HTML and CSS features are and aren't available.
- Modern desktop browsers will happily run code the TV can't. "Works in my browser" proves nothing about the TV. Rely on the rules below, on ESLint (it parses the runtime JS as ES5), and on checking against the feature doc.
- The TV is driven with a remote, not a mouse. Interactive elements are native `<button>`, `<select>` and the like (tiles too), so they are focusable and work with Enter/OK without key handling. Give focus to the main action where it helps, for example the retry button on the load-error screen.

Runtime code rules:

- Use `var` and `function`.
- Do not use `let`, `const`, arrows, classes, template literals, destructuring, spread, default/rest parameters, modules, `async`/`await`, or `fetch`.
- Do not use post-ES5 built-ins such as `String.prototype.includes`/`startsWith`, `Array.prototype.find`/`includes`, `Array.from` or `Object.assign`.
- Use `XMLHttpRequest` for loading data.
- Use helper functions instead of monkey-patching or polyfilling built-ins.
- Do not use Web Components in any form: no custom elements (`customElements.define`, `document.registerElement`), no Shadow DOM (`attachShadow`, `createShadowRoot`) and no HTML Imports, and no libraries built on them. The TV lacks the v1 APIs and the v0 ones are unreliable. Reusable UI pieces are plain ES5 functions that we write ourselves, built from ordinary elements and `<template>`.
- CSS must avoid Grid, custom properties, flex `gap`, `aspect-ratio`, `position: sticky`, `place-items`, `color-scheme` and `:is()`/`:where()`/`:has()`. Flexbox is fine.
- Keep the grid in its own component (`public/components/grid/`).
- `public/vendor/hls.light.min.js` (hls.js 0.14.17, chosen to fit this browser) is vendored third-party code. Lint and type checks skip it.

The scraper and other tools under `scripts/` run on the developer's machine with modern Node. They are **not** bound by these rules.

## Production And Deployment

- **Production URL:** https://barnasendingar.vercel.app
- **Host:** Vercel, connected to the GitHub repo through Vercel's Git integration. There is no `.vercel/` link in the repo and no Vercel CLI workflow.
- **Normal flow:** pushing to `master` deploys to production automatically. Other branches get Vercel preview deployments (Vercel's default behaviour).
- **Current state (November 2026):** the `vanilla-spa-rewrite` branch was promoted to production by hand in the Vercel dashboard, overriding `master`. Once that branch is merged, `master` becomes the production source again. Until then, keep in mind that production reflects this branch, not `master`.
- **Build:** none, by design (see [Invariant: No Build Step](#invariant-no-build-step)). `vercel.json` sets `framework: null` and `buildCommand: null`, serves the committed `public/` directory as-is, and rewrites unknown paths to `/index.html`. App navigation uses hash routes, so deep links never need server-side handling.
- **Updating content:** run the scraper, commit the updated `public/assets/shows.json`, and push. No other step is needed.

## Runtime Architecture

The app is a no-build, framework-free single-page app served from `public/`.

- The component model, and where it is heading, is described in [`docs/component-model.md`](docs/component-model.md). The bullets below describe the code as it is today.
- Code is grouped by page. Shared code lives in `public/core/`. Reusable UI components live in `public/components/<component>/`, and each page has its own folder under `public/pages/<page>/`. Each folder holds one `.js` and usually one `.html`. The `.html` holds the folder's `<template>` elements and its styles in a `<style>` element. There are no `.css` files for components or pages; the only stylesheet is `core/base.css`, for global styles. The TV has no CSS custom properties, so the comment at the top of `base.css` lists the shared colours and breakpoints; keep it up to date.
- There are no imports, because the TV has no ES modules. `public/index.html` loads `core/base.css` with `<link>`, and every script with plain `<script>` tags in order: `errors/errors.js`, `boot/boot.js`, then `vendor/hls.light.min.js`, then `core/` (`app.js`, `http.js`, `dom.js`, `data.js`, `watched.js`, `templates.js`, `router.js`, `routes.js`), then one `<script>` per component folder, then one per page folder. It then calls `window.BS.start()`. Adding a component or page is one `<script>` line there, and nothing else outside its folder.
- There is one global namespace, `window.BS`. Each core file creates its own part of it, named after the file (`BS.http`, `BS.dom`, `BS.data`, `BS.watched`, `BS.templates`), and keeps its state private. `core/app.js` adds `BS.start`, `BS.logError` (the only way runtime code logs errors; it also reports them, see below) and the empty `BS.components` and `BS.pages`, which the component and page scripts fill. `core/http.js` has `BS.http.getText` and `BS.http.getJson`, XHR with a timeout. Each page registers itself as `BS.pages.<name>` with a `render(root, ...)` function. The router empties `root` before calling it. `render` sets the title with `BS.dom.setTitle(...parts)` (most specific first; it adds `- Barnasendingar`), and may return a cleanup function that the router calls when leaving the page.
- **Focus:** every page ends `render` by focusing its main element: on the front page the show you came back from, otherwise the first tile; on the show page the episode you came back from, otherwise the first unwatched one, otherwise the first; on the episode page the video (the back button if there is no playable video); on not-found the "Aftur til forsíðuna" button. The page module remembers what was open, not the router: the page one level down tells it with `BS.pages.home.rememberShow(show)` and `BS.pages.show.rememberEpisode(show, episode)`, which also covers autoplay and deep links.
- **CSS-only components** have no behaviour of their own: `button` (`.button`, and `.button-icon` for a square icon-only button), `icon` (the SVG sprite and `.icon`) and `select` (`.select`, and `.select-label` for its `<label>`). Their folder holds the styles (and, for `icon`, the sprite) and a one-line `.js` that calls `BS.load`. Pages and components write the native element with the component's classes straight into their template, for example `<button type="button" class="button">` or `<select class="select" id="...">`. Every button has the `.button` class, except the load-error screen's "Royn aftur", which is styled by `.boot-retry` in `index.html` because it must work without the loaded styles.
- **Icons** come only from the `icon` component's sprite, as `<symbol id="icon-<name>">`, used with `<svg class="icon" aria-hidden="true" focusable="false"><use xlink:href="#icon-back"></use></svg>`. It must be `xlink:href`: plain `href` on `<use>` is newer than Chrome 38. No other inline SVG or icon-like text characters (such as `⇦`) in pages or components. Icon-only buttons always have both `aria-label` and `title`, in Faroese.
- **Factory components** are functions on `BS.components`, for example `BS.components.tile(options)`, `BS.components.grid(options)`, `BS.components.qualitySelect(options)` and `BS.components.player(options)`. Each takes an options object (data in, callbacks such as `onActivate` or `onChange` out) and returns an object with its root `element`, plus methods for state that changes (such as `setWatched` or `setLevels`) and `destroy()` if it has handlers to remove. Components build on native elements (`<button>`, `<select>`, `<input>`), so the TV remote, focus and Enter/OK keep working. They never read `BS.data` or call the router; the page using them decides what happens. Pages are not components.
- **Tiles and grid:** a tile (`BS.components.tile({ title, image, watched, onActivate })`) is a `<button>` with a title, a decorative image (`alt=""`) and a "Sæð" marker, and returns `{ element, setWatched, focus }`. Show and episode tiles look the same. `BS.components.grid({ toolbar, items })` lays out tiles in a centred inner container that is a whole number of columns wide, so the last row and the optional toolbar (an element or an array of them, such as the show page's buttons) line up with the first column. The column widths live in `grid.html` and are tied to the tile width in `tile.html`. A page puts a factory component where a placeholder with a `data-ref` sits in its template with `BS.dom.replace(placeholder, element)` (`public/core/dom.js`, where new DOM helpers go, such as `BS.dom.setTitle`).
- **Page and component HTML** lives in `<template id="...">` elements in the folder's `.html` file, with the folder's styles in a `<style>` at the top. The first statement of each component and page script is `BS.load('<name>.html')`, with the file name relative to the script. `BS.load` (`public/core/templates.js`) resolves it through `document.currentScript`, so it only works while the script first runs, and throws if called later. At startup, `BS.templates.load` fetches every registered file with XHR. Once all have loaded, it uses each file's top-level content in registration order (the `<script>` order): each `<template>` is stored by id, each `<style>` is added to `<head>`, and anything else is added to the end of `<body>`. The cascade is therefore core, components, pages, whatever order the requests finish in. Pages then call `BS.templates.clone(id)`, which returns `{ fragment, element, refs }`; `refs` maps each element's `data-ref` attribute value to the element. Template ids are global, so prefix them with the page or component name. Components load and clone templates the same way. Keep structure and static text in the HTML, and use JS only for data, event handlers and showing/hiding parts.
- At startup, `BS.data.load` loads the show and episode metadata from `/assets/shows.json`, in parallel with the templates. `public/core/data.js` keeps the catalogue private and answers `getShows()`, `getShow(title)`, `getEpisode(show, title)` and `getNextEpisode(show, episode)`. Both loads have timeouts (`BS.data.loadShowsTimeoutMs`, `BS.templates.loadTimeoutMs`). The loading screen, "Lesur barnasendingar...", shows meanwhile. If either fails, the load-error screen with a "Royn aftur" (retry) button appears, with focus on the button. Both screens are static markup in `public/index.html`, next to `#app`, with their styles in a `<style>` there. `public/boot/boot.js` drives them with `BS.boot.showLoading()`, `BS.boot.showError(onRetry)` and `BS.boot.hide()`. It loads first and uses only the DOM (no core modules, templates, components or router), so the screens work whatever failed to load. `core/app.js` calls it.
- **Routing** is split in two. `public/core/router.js` is a small, generic hash router, `BS.createRouter({ root, routes, notFound })`, that knows nothing about this app. `public/core/routes.js` holds this app's route table: named routes with path patterns such as `/sending/:show/partur/:episode`, whose `render(root, params)` looks up the data and renders the page (or the not-found page). `core/app.js` creates the router as `BS.router` once loading has finished. The router encodes and decodes params itself, so pages pass plain titles. Its API:
  - `go(name, params)` navigates and adds a history entry. `go(name, params, { replace: true })` replaces the current entry instead. Adding `render: false` only changes the address; the episode page uses that to move on to the next episode in the same player.
  - `back(name, params)` is for on-screen back buttons, and every in-app back button must use it. It goes back through browser history when the target is the previous entry, and otherwise replaces the current page with the target, so back buttons never add history entries or leave the app. To know the previous entry, the router stores its position in each entry's `history.state`, which keeps it in sync when the remote's back key moves through history.
  - `href(name, params)` builds an address, `refresh()` renders the current page again and `current()` returns `{ name, params }`.
- Video plays as HLS from `vod.kringvarp.fo`. `BS.data.playlistUrl(mediaId)` builds the playlist URL from each episode's `mediaId`: `https://vod.kringvarp.fo/redirect/video/_definst_/smil:smil/video/${mediaId}.smil?type=m3u8`.
- **Player:** `BS.components.player({ onEnded, onLevels })` (`public/components/player/`) owns the `<video>` and everything about playing it: hls.js setup and teardown, recovery from fatal hls.js errors, the fallback to the browser's own HLS support, the "Hesin kaga dugir ikki at spæla video." message, and starting playback and requesting fullscreen once the stream is ready. It takes a URL and knows nothing about KVF, shows or episodes. It returns `{ element, load({ src, poster }), showMessage(text), setLevel(index), requestFullscreen(), focus(), destroy() }`. `load` reuses the same `<video>`, which keeps fullscreen when moving on to the next episode. `focus()` returns `false` when a message shows instead of the video. `onLevels` gets `[]` when a source starts loading and the stream's levels once they are known, which the episode page passes to its quality select.
- **Error reporting:** `public/errors/errors.js` loads first and, like `boot.js`, uses only the DOM. It catches uncaught errors (`window.onerror`) and everything passed to `BS.logError`, which includes failed startup loads, fatal hls.js errors and `<video>` errors. On `*.vercel.app` (production and previews) it sends each to PostHog's error tracking (EU project, `$exception` events through the capture API, no SDK): each message once, at most 10 per page load, with the address, user agent, screen size and a random install id kept in `localStorage` under `errorReporterId`. Nothing else is sent: no page views or analytics. Anywhere else, such as localhost and the tests, it sends nothing. With `?debug` in the address, before the `#` (for example `https://barnasendingar.vercel.app/?debug#/`), an overlay at the bottom of the screen lists the errors, with the user agent, screen size and whether reporting is on. Its markup and styles are in `index.html`. It doesn't show over fullscreen video.
- Watch history is stored only in the browser's `localStorage`, under the key `watched`, in the shape `{ [showTitle]: { [episodeSortKey]: true } }` (see `public/core/watched.js`). There are no accounts and no server-side state, apart from the error reports in PostHog.

The app has three main pages, plus a not-found page (`public/pages/not-found/`):

1. **Front page (`#/`):** a grid of every show in `shows.json`, each with its poster and title. Selecting a tile opens the show. See `public/pages/home/`.
2. **Show page (`#/sending/<showTitle>`):** a grid of the show's episodes in JSON order. Finished episodes get a "Sæð" ("watched") overlay. A `Nulstilla "Sæð"` button clears the show's watch history and updates the tiles in place, so it keeps focus. See `public/pages/show/`.
3. **Episode page (`#/sending/<showTitle>/partur/<episodeTitle>`):** the `player` component, with a header holding the back and fullscreen buttons, the titles and a quality select outside the native controls. The page marks the episode watched when it ends and moves on to the next one (`BS.data.getNextEpisode`), and shows "Hesin parturin hevur einki video." through `player.showMessage` for an episode without video. See `public/pages/episode/`.

UI text is in Faroese. Keep new UI strings in Faroese.

## Repository Layout

| Path                             | What it is                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| `public/`                        | The deployed site. Everything here is served exactly as committed.                 |
| `public/assets/shows.json`       | Scraped catalogue. Generated by the scraper and committed.                         |
| `public/boot/`                   | The boot screens' script (`BS.boot`). Their markup and styles are in `index.html`. |
| `public/errors/`                 | Error reporting to PostHog and the `?debug` overlay (`BS.errors`).                 |
| `public/core/`                   | Shared runtime code and CSS (bootstrap, router, data, templates, base styles).     |
| `public/components/<component>/` | One folder per reusable UI component: its JS, and HTML templates and styles.       |
| `public/pages/<page>/`           | One folder per page: its JS, and HTML templates and styles.                        |
| `public/vendor/`                 | Vendored third-party code (hls.js). Not linted or type-checked.                    |
| `scripts/`                       | Modern Node/TypeScript tooling, with its own `tsconfig.json`.                      |
| `scripts/scrape.ts`              | KVF metadata scraper that writes `public/assets/shows.json`.                       |
| `scripts/delete_duplicates.ts`   | Removes duplicate episodes (by `sortKey`) from the scraped JSON.                   |
| `scripts/download-show.ts`       | Interactive downloader for saving a show locally through `yt-dlp`.                 |
| `scripts/keepawake.ts`           | Cross-platform wake-lock helper used by `download-show.ts`.                        |
| `scripts/status.ts`              | Terminal status line with a progress bar and a scrolling log, used by `scrape.ts`. |
| `scripts/shared-types.d.ts`      | Shared `Show` and `Episode` types, used by both the scripts and runtime JSDoc.     |
| `docs/`                          | Project documentation. See [Documentation](#documentation).                        |
| `tests/`, `playwright.config.ts` | Unit, component and e2e tests. Dev-only, not deployed. See [Tests](#tests).        |
| `vercel.json`                    | Vercel static deployment config.                                                   |

`dist/`, `.svelte-kit/` and `downloads/` are git-ignored leftovers or local output and can be ignored.

## Working In This Project

### Setup

- Node 22.18 or newer (the package scripts use `node --run`, and the tests and the `scripts/` tools are TypeScript run directly by Node, which strips the types).
- Run `npm install` in the repo root. There is one `package.json`, holding every dev tool: lint, type check, tests and the scraper's dependencies. Nothing in it is deployed.
- Run `npx playwright install chromium` once, for the component and e2e tests.
- `yt-dlp` on `PATH` is only needed for `download-show`.

### Commands

Run package scripts with `node --run <script>`, not `npm run`.

| Script              | Command                                                            | Description                                                                                                        |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `serve`             | `sirv public --dev --single --port 4387`                           | Serves `public/` locally on port 4387. `--dev` picks up new files and disables caching.                            |
| `check`             | `tsc --noEmit && tsc --noEmit -p tests && tsc --noEmit -p scripts` | Type-checks the runtime JavaScript in `public/` through JSDoc, the tests and `scripts/`.                           |
| `test`              | `node --run test:unit && playwright test`                          | Runs all three test tiers.                                                                                         |
| `test:unit`         | `node --test "tests/unit/**/*.test.ts"`                            | Runs the unit tests with Node's test runner.                                                                       |
| `test:component`    | `playwright test --project=component`                              | Runs the component tests in headless Chromium.                                                                     |
| `test:e2e`          | `playwright test --project=e2e`                                    | Runs the e2e tests in headless Chromium.                                                                           |
| `lint`              | `prettier --check . && eslint .`                                   | Checks formatting and lints. ESLint parses runtime JS as ES5.                                                      |
| `format`            | `prettier --write .`                                               | Formats the repo. Use it on purpose, because it rewrites many files.                                               |
| `scrape`            | `node scripts/scrape.ts && node --run delete-duplicates`           | Scrapes show and episode metadata from KVF, then removes duplicate episodes and writes `public/assets/shows.json`. |
| `delete-duplicates` | `node scripts/delete_duplicates.ts`                                | Removes duplicate episodes in `public/assets/shows.json` by `sortKey`.                                             |
| `download-show`     | `node scripts/download-show.ts`                                    | Interactively downloads a selected show through `yt-dlp` into `downloads/`.                                        |

The tools run with plain `node`, which only strips types. Use only TypeScript syntax that can be erased (no enums, namespaces or parameter properties), write relative imports with their `.ts` extension, and import JSON with `with { type: 'json' }`. `erasableSyntaxOnly` in `scripts/tsconfig.json` enforces the first rule.

### Dev Environment

There is no build, bundler, dev server with hot reload, or watch mode. The files in `public/` are the site.

- Start a static server with `node --run serve` and open http://localhost:4387. Edit or add a file under `public/` and reload the page to see the change. There is no live reload, but the server never needs a restart: `--dev` makes sirv read files from disk on every request and send `Cache-Control: no-store`. Without `--dev`, files created after startup return 404.
- Run long-lived servers in the background and stop them when you're done, so they don't hold the port.
- The local site uses the real `public/assets/shows.json`, real KVF poster images and real video from `vod.kringvarp.fo`. Playback needs internet access, but no keys or accounts.
- Any page can be opened directly through its hash route, for example `http://localhost:4387/#/sending/<showTitle>` with the title URL-encoded. An unknown route shows the not-found page.
- Watch history is in `localStorage` under `watched`. Clear it in devtools, or with the page's `Nulstilla "Sæð"` button, to reset state between tests.
- To see errors on screen, add `?debug` before the `#`, for example http://localhost:4387/?debug#/. This also works on the TV, against the Vercel deployments.
- To see the load-error screen and the "Royn aftur" button, block `/assets/shows.json` or one of the `pages/*/*.html` files in devtools (Network → Block request URL) and reload.

### Checks

The tooling is exactly this. Every tool only reads and reports, or formats source in place. None of them is a build step (see [Invariant: No Build Step](#invariant-no-build-step)).

| Tool                                       | What it catches                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prettier**                               | Formatting, across the whole repo.                                                                                                                                                                                                                                                                                                                                                                                                 |
| **ESLint**                                 | Parses runtime JS as ES5, so it rejects any post-ES5 **syntax** (`let`, arrows, template literals and so on). This is the main guard against syntax the TV can't run. Also the recommended rules, such as unused variables.                                                                                                                                                                                                        |
| **TypeScript 7** (`tsc`, `noEmit`)         | Type errors in the runtime JS through its JSDoc, in the tests and in `scripts/`. For runtime code, `lib: ["DOM", "ES5"]` flags built-ins from ES2016 on (such as `Array.prototype.includes`, `Object.entries`, `padStart`). It can't flag ES2015 built-ins (`String.prototype.includes`/`startsWith`, `Array.prototype.find`, `Array.from`, `Object.assign`), because TypeScript's DOM library pulls in the ES2015 library itself. |
| **The Chrome 38 scan**                     | Patterns in `tests/unit/chrome38-scan.ts`, run over runtime JS, CSS and HTML by `chrome38.test.ts`. They catch features the TV lacks that the tools above miss: those ES2015 built-ins, newer DOM APIs, unsupported CSS and HTML, and Web Components.                                                                                                                                                                              |
| **Node's test runner, Playwright, `sirv`** | The unit, component and e2e tests (see [Tests](#tests)). They run in modern Node and Chromium, so they check behaviour, not TV compatibility.                                                                                                                                                                                                                                                                                      |

Every tsconfig (root, `tests/` and `scripts/`) is strict, and none turns a strict option off. Fix type errors with types, never by loosening the config: in runtime code with JSDoc (`@param`, `@type {?X}`, `@type {Object<string, X>}`), which changes only comments, and in `scripts/` by handling values that can really be missing rather than asserting them away with `!`. `any` is only for values that have no type here, the `BS` namespace and the hls.js instance, each with a comment saying why. Don't use `@ts-ignore` or `@ts-expect-error`.

`tests/unit/chrome38-checks.test.ts` keeps these honest. It has one probe per feature listed under "Not Available" in [`docs/chrome38-features.md`](docs/chrome38-features.md), runs each through ESLint and `tsc` with the project's configs and through the scan, and fails if a tool that should catch it doesn't. A valid ES5 control must pass all three. When you add a feature to that list, add a probe for it, and a scan pattern if nothing catches it yet.

Before handing off a runtime change:

1. Run `node --run check` (type check), `node --run lint` (Prettier + ESLint) and `node --run test` (all tests). For a quicker pass, run `npx eslint .` and `npx prettier --check <changed files>`. Format changed files with `npx prettier --write <files>`, not `node --run format`, which rewrites the whole repo.
2. Re-read the change against [`docs/chrome38-features.md`](docs/chrome38-features.md). ESLint only catches post-ES5 **syntax**, and `tsc` and the Chrome 38 scan only catch some built-ins, DOM APIs and CSS. Check the rest by hand.
3. Add or update tests for the change in the right tier (see [Tests](#tests)).
4. Run the site and go through every affected page in a browser (see below). Watch the console for errors.
5. If possible, check the change on the TV itself (see below).

`node --run check` also type-checks `scripts/`.

### Testing In A Browser

A desktop browser can show that the logic, layout and flows work. It can't show that the code runs on the TV.

- **By hand:** click through the affected pages. Also drive them with the keyboard only (Tab, Enter and the arrow keys), because the TV remote behaves like that, and make sure focus is visible and that Enter activates tiles and buttons.
- **Regression check for refactors:** export the last commit with `git archive HEAD public | tar -x -C <tmp dir>` (read-only, it doesn't touch the worktree), serve it on a second port, and compare screenshots of old and new at the same routes and widths. If a change isn't supposed to look different, the screenshots should match pixel for pixel.

### Tests

There are three tiers. Put each test in the lowest tier that can show the behaviour, and keep the suite small: one test per behaviour, not per detail.

| Tier          | Folder             | Runner                  | What it covers                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------- | ------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**      | `tests/unit/`      | `node --test`           | Logic that needs no DOM: routing, data lookups, watch history. Also static checks: `chrome38.test.ts` scans runtime code for features the TV lacks, `chrome38-checks.test.ts` checks that ESLint, `tsc` and that scan catch every feature the TV lacks, `css-prefix.test.ts` checks that every selector in a component's or page's `<style>` starts from one of the folder's own (name-prefixed) classes, and `catalogue.test.ts` sanity-checks the real `shows.json`. |
| **Component** | `tests/component/` | Playwright, `component` | One component from `public/components/` on its own, on a blank test page: what it renders for given options, keyboard/click handling, callbacks and methods.                                                                                                                                                                                                                                                                                                           |
| **E2E**       | `tests/e2e/`       | Playwright, `e2e`       | The whole app as a user uses it: browsing with the remote, playback and moving on to the next episode, "Sæð", deep links, not-found, load failure and retry. Pages are tested here, not as components.                                                                                                                                                                                                                                                                 |

- **Unit tests** load the runtime scripts into a sandbox with `loadRuntime()` from `tests/unit/runtime.ts`, the way `<script>` tags would, with fakes for browser globals such as `localStorage`. Objects from the sandbox come from another realm, so copy them with `plain()` before comparing with `assert.deepEqual`.
- **Component tests** call `loadComponents(page, ['<component>'])` from `tests/component/mount.ts`, which serves a blank page with hls.js, core and those components, then build the component with `page.evaluate()` and append it to `#root`.
- **E2E tests** import `test` and `expect` from `tests/e2e/app.ts` instead of `@playwright/test`. That fixture serves `tests/fixtures/shows.json` in place of the real catalogue, fakes the HLS master playlist (two quality levels, no real video, from `tests/fixtures/hls.ts`, which the player's component test shares), blocks every other outside request, and records requested playlist URLs in `playlistRequests`. The fixture catalogue includes awkward titles (`/`, `#`, `?`, `&` and Faroese letters) and an episode without video.
- Playwright starts its own `sirv` server on port 4388. Test hooks set on `window` from tests are named `test*` (typed in `tests/globals.d.ts`).
- The Chrome 38 scan is a safety net of simple patterns, not proof of compatibility. When it flags a false positive, adjust its pattern in `chrome38-scan.ts` rather than working around it in runtime code, and keep `chrome38-checks.test.ts` passing.
- A forgotten `<script>` in `index.html` throws as soon as the code is used, and a missing `.html` file shows the load-error screen at startup, so neither has a guard test. The Chrome 38 scan checks `<style>` elements in `.html` files against the CSS rules, as well as `.css` files.
- All tests run in modern headless Chromium, so they check behaviour, not that the code runs on the TV.

### Testing On The TV

The real target is the LG TV, which acts like Chrome 38. To test there, the user pushes a branch and opens the Vercel preview deployment URL in the TV's browser. Agents can't do this. When a change carries real compatibility risk (new DOM APIs, CSS or video/fullscreen behaviour), say so and ask the user to check it on the TV.

Errors on the TV reach PostHog's error tracking (https://eu.posthog.com/project/331417) when it uses a Vercel deployment. Add `?debug` before the `#` to see them on the TV's screen as well.

### Common Tasks

- **Refresh the catalogue:** run `node --run scrape`. It fetches every children's show and episode from kvf.fo, which takes a while and makes many requests, then removes duplicates and rewrites `public/assets/shows.json`. Look over the diff of that file to check it is sensible before the user commits it.
- **Change a page:** edit the files in `public/pages/<page>/`. Markup goes in the `.html` templates, page-only styles in the `<style>` at the top of the `.html`, and behaviour in the `.js`. Styles shared by more than one page go in `public/core/`.
- **Add a component:** create `public/components/<component>/` with `<component>.html` (a `<style>` if needed, and its templates) and `<component>.js`, whose first statement is `BS.load('<component>.html')` and which defines `BS.components.<name>`. Add its `<script>` to `public/index.html` after core and before the pages, and add a component test. Only make a component for UI that is actually reused.
- **Add a page:** create `public/pages/<page>/` with `<page>.html` (a `<style>` if needed, and templates with ids prefixed by the page name) and `<page>.js`, whose first statement is `BS.load('<page>.html')` and which defines `BS.pages.<name>`. Add its `<script>` to `public/index.html`, then add a route to `public/core/routes.js`.
- **Download a show for offline use:** run `node --run download-show`. It is interactive and needs `yt-dlp`. Files go to `downloads/`, which is git-ignored.

### Git Policy

Git belongs to the user. The user alone maintains the repository, the index and the worktree's git state. Agents must not meddle with it.

- Agents may run **read-only** git commands only, for example `git status`, `git diff`, `git diff --cached`, `git log`, `git show`, `git blame` and `git branch --show-current`.
- Agents must **never** run a git command that writes or changes anything. That includes staging and unstaging (`git add`, `git rm`, `git mv`, `git restore`), committing, amending, switching or creating branches, resetting, checking out files, stashing, merging, rebasing, cherry-picking, tagging, cleaning, changing config, creating worktrees, fetching, pulling and pushing. Pushing to `master` deploys to production.
- To move or delete files, use plain filesystem commands (`mv`, `rm`), not their git equivalents.
- Expect the user to stage and unstage files while you work. Changes in `git status` or `git diff --cached` that you didn't make are normal. Don't treat them as a problem, don't try to undo them, and don't report them as surprising.

## Documentation

All project documentation lives in [`docs/`](docs/). Add new docs there and link them here.

| Document                                                                   | What it covers                                                                                                                                                                      |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/chrome38-features.md`](docs/chrome38-features.md)                   | Which JavaScript, HTML and CSS features the TV's Chrome 38-era browser supports. Read before writing runtime code.                                                                  |
| [`docs/component-model.md`](docs/component-model.md)                       | How components and pages are built, loaded and put together: CSS-only components, factory components, `BS.load`, templates, styles. Read before adding or changing UI.              |
| [`docs/component-cleanup-plan.md`](docs/component-cleanup-plan.md)         | Implemented plan that built the current component model, in nine chunks: tooling, loading, icons and buttons, tiles and grid, focus, select, player, boot screens and core cleanup. |
| [`docs/vanilla-spa-migration-plan.md`](docs/vanilla-spa-migration-plan.md) | Historical, already implemented plan for replacing the original SvelteKit app with the current vanilla SPA. Background on the design decisions.                                     |
