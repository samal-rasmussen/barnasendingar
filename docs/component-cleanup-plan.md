# Component Cleanup Plan

> **Status: in progress.** Chunks 0, 0.5, 1, 2 and 3 are done. Update the status of each chunk as it lands.
>
> An earlier version of this plan had a "safety net" chunk 1 that added `tests/unit/index-html.test.ts`. That test was committed, but this version of the plan makes it unnecessary, and the new chunk 1 deletes it.

## Goal

Make the runtime code more cohesive and encapsulated. Each piece of UI should live in one component that owns its markup, styles and behaviour, and pages should only put components together and wire up the data. Along the way, fix the UX problems the audit found, mainly around focus and the TV remote.

Stay as close to plain HTML, CSS and JavaScript as possible. Adding or removing a component or page should take one line in `index.html` and nothing else outside its own folder. There is no framework, no component registry and no dependency lists.

Small visual and UX improvements are expected. A change must never make anything worse than it is now: no regressions in layout, behaviour, accessibility or TV compatibility.

## How The Work Is Split

The work is split into ten chunks, numbered 0, 0.5 and 1 to 8. Each chunk:

- is one cohesive change that can be reviewed, committed and deployed on its own
- leaves the app fully working, with `node --run check`, `node --run lint` and `node --run test` passing
- updates `AGENTS.md` in the same chunk when it changes how things are done
- updates [`component-model.md`](component-model.md) in the same chunk if it changes the model, and the model's status note as parts of it land
- adds or updates tests in the right tier (unit, component or e2e)

The chunks are ordered by value and dependencies. Chunk 0 updates the tooling first, so every later chunk is checked by the versions the project keeps. Chunk 0.5 makes the type check strict, so every later line is written against it. Chunk 1 changes how files are loaded, which every later chunk relies on. After that, the things a child on the TV notices most (buttons, tiles, focus) come first. Internal tidying comes last, once the earlier chunks have removed most of what it would otherwise move around.

| #   | Chunk                    | Depends on | User-visible                              | TV check   |
| --- | ------------------------ | ---------- | ----------------------------------------- | ---------- |
| 0   | Tooling                  | –          | No                                        | No         |
| 0.5 | Strict TypeScript        | 0          | No                                        | No         |
| 1   | Loading                  | 0.5        | No                                        | Yes        |
| 2   | Icons and buttons        | 1          | Yes: SVG back arrow, labelled buttons     | Yes        |
| 3   | Tiles and grid           | 2          | Yes: unified tiles, reset keeps focus     | Yes        |
| 4   | Page lifecycle and focus | 3          | Yes: focus lands on the right thing       | Yes        |
| 5   | Select                   | 1          | Small: consistent select styling          | No         |
| 6   | Player                   | 2, 5       | No (behaviour unchanged)                  | Yes, video |
| 7   | Boot screens             | 1          | Small: loading and error screens restyled | Yes        |
| 8   | Core cleanup             | 3, 6, 7    | No                                        | No         |

Chunks 5 and 7 only depend on chunk 1 and can be moved earlier if that's convenient.

## Decisions

These were settled before writing the plan, or follow from those answers.

1. **A component is a folder with one `.js` and usually one `.html`.** The `.html` holds the component's `<template>` elements and its styles in a `<style>` element. There are no separate `.css` files for components or pages. The only stylesheet file left is `core/base.css`, for global styles.
2. **The `.js` file loads its own `.html`.** Its first statement is `BS.load('<name>.html')`, with the file name relative to the script (resolved through `document.currentScript`, which the TV has). `index.html` has exactly one `<script>` per component or page folder, and nothing else per folder. Adding a component is: create the folder, add its `<script>`. Removing it is: delete the folder and that line.
3. **Mistakes fail loudly, so they don't need guard tests.** A missing `<script>` throws as soon as the code is used (`BS.components.tile is not a function`). A missing `.html` file fails at startup and shows the load-error screen. The template and style for a component sit in the same file, so one can't be forgotten without the other.
4. **Components without behaviour are only CSS.** A button, an icon button, an icon and a select have no logic of their own. They are native elements with the component's classes, written straight into the page's template. Their API is the native one: `onclick`, `disabled`, `focus()`, `value`. Their folder holds the `<style>` (and, for icons, the SVG sprite) and a one-line `.js` that loads it.
5. **Components with behaviour or data are JS factories with templates**, as `tile` and `qualitySelect` already are: `BS.components.<name>(options)` returns `{ element, ...methods }`. Pages put a placeholder element with a `data-ref` in their template where such a component goes, and swap it for the component's element with `BS.dom.replace(placeholder, element)`. That keeps the page's layout readable in its HTML without wrapper elements.
6. **Buttons are real `<button>` elements**, including tiles. Nothing uses a `div` with `role="button"` any more, and `BS.util.onActivate` is deleted.
7. **All SVG icons live in the `icon` component**, as `<symbol>` elements in one hidden SVG sprite. Pages use them with `<svg class="icon"><use xlink:href="#icon-back"></use></svg>`. It must be `xlink:href`, because plain `href` on `<use>` is newer than Chrome 38. No page or component contains other SVG or icon-like text characters such as `⇦`.
8. **The loading and load-error screens are primitive pages**, isolated from everything they are a fallback for. They use no templates, components, router, `BS.load` or `util`. Their markup and styles are static HTML and a `<style>` in `index.html`, because that is the only HTML file guaranteed to have loaded when templates or data fail.
9. **There is no shared "message" component.** That idea from the audit is dropped. The boot screens are isolated (decision 8), not-found is an ordinary page, and the player owns its own messages. What's left isn't shared enough to be a component.
10. **One tile look.** Show tiles and episode tiles use the same tile without page-specific overrides. Where the two differ today, pick whichever looks better, and show before/after screenshots for review.
11. **Focus follows the remote.** Every page focuses its main element when it renders, and coming back to a page puts focus back on the tile you came from.
12. **No new lifecycle system.** Listeners on a component's own elements go away with the elements. Only things outside the component (hls.js, listeners on `document`) need cleanup, through `destroy()` on the component and the cleanup function a page's `render` returns.

The model these decisions add up to is described in [`component-model.md`](component-model.md), together with the alternatives that were considered and rejected.

## Rules For Every Chunk

- Follow `AGENTS.md` and [`chrome38-features.md`](chrome38-features.md): ES5 only, no Web Components, no unsupported CSS.
- Component CSS classes are prefixed with the component name (`.tile`, `.tile-title`, `.button`, `.button-icon`), and page classes with the page name (`.episode-header`). Every selector in a folder's `<style>` starts from one of its own classes. After that it may name another component's classes to style it in that place (`.show-toolbar .tile-title`), but prefer an option or a modifier class on the component when the look is something the component should offer anyway.
- `tests/unit/css-prefix.test.ts` enforces this for every selector in a component's or page's `<style>`. Its `knownExceptions` lists the selector starts that break the rule today, each with the chunk that removes it. A chunk that removes or renames one deletes its entry, and nothing adds new entries.
- Before starting, snapshot `public/` as described in `AGENTS.md` and compare screenshots afterwards at 1920, 1100, 700 and 400 px. Anything that isn't pixel-identical must be an intended improvement, and should be shown to the user.
- Prefer finding elements in e2e tests by role and accessible name (`getByRole('button', { name: 'Aftur' })`) over CSS classes.
- Delete what a chunk makes unused, in the same chunk.
- If a chunk turns out bigger than described, split it rather than leaving it half done.

---

## Chunk 0: Tooling

> **Status: done.**

**Why first:** every later chunk runs the type checker. Updating it first means the later chunks are checked by the version the project keeps, and any fixes it needs land in a chunk that changes nothing else.

**Invariant:** the project has checks, never build steps (see "Invariant: No Build Step" in `AGENTS.md`). Every tool only reads and reports, or formats source in place. None of them produces anything the site needs.

**The tooling after this chunk is exactly:**

- **Prettier** for formatting (unchanged)
- **ESLint** for linting (unchanged). It parses runtime JS as ES5, the main guard against syntax the TV can't run.
- **TypeScript**, the newest release (7.x), for type checking only, with `noEmit`
- the test runners: Node's test runner, Playwright and `sirv`
- plain `node` for the `scripts/` tools, replacing `tsx`

**Type checking (TypeScript 7)**

- Update `typescript` in the root and in `scripts/` to the newest release.
- TypeScript 7 removes options that 6.0 deprecated, including `target: "ES5"` and `moduleResolution: "node"`. Update `tsconfig.json`: pick a supported `target` (it only affects emit, and nothing is emitted), drop or replace `moduleResolution`, and keep `lib: ["DOM", "ES5"]`, which flags post-ES5 built-ins in runtime code. (As implemented: it flags built-ins from ES2016 on, such as `Array.prototype.includes`. TypeScript's DOM library pulls in ES2015 itself, so ES2015 built-ins such as `String.prototype.includes` are left to `tests/unit/chrome38.test.ts`. TypeScript 5.9 flagged neither, because it pulled in `@types/node` and with it the newest libraries.) Losing `target: "ES5"` costs nothing: `tsc` never rejected post-ES5 syntax in JS files anyway. ESLint does that.
- JSDoc checking of JavaScript changed in TypeScript 7. Fix new errors in runtime code by correcting the JSDoc, not by loosening the config.
- Check by hand once that a `String.prototype.includes` call in a runtime file still makes `node --run check` fail. (As implemented: it doesn't, see above. `Array.prototype.includes` does.)

**Scripts**

- Run the `scripts/` tools with plain `node`, as the tests already are, and remove `tsx` from `scripts/package.json`. Node only strips types, so rewrite any TypeScript syntax it can't strip (enums, namespaces, parameter properties) as plain TypeScript, and use `.ts` extensions in relative imports. `erasableSyntaxOnly` in `scripts/tsconfig.json` keeps it that way, as it already does for the tests.
- Run `node --run scrape` far enough to see that it starts, and `node --run delete-duplicates` in full (it only rewrites `shows.json`, which should come out unchanged).

**`AGENTS.md`:** update the `scripts/package.json` Commands table, and list the tooling and what each tool catches in the Checks section.

**Considered and rejected:** moving to oxlint and oxfmt. oxlint always parses the newest JavaScript and has no equivalent of ESLint's `ecmaVersion: 5`. `eslint-plugin-es-x` would only blacklist known features, through oxlint's alpha JS plugin support, and an ES5 parse test would only fail when tests run, not in the editor. Without oxlint, oxfmt alone isn't worth it: Prettier checks the repo in about a second, oxfmt hands HTML and Markdown to a bundled Prettier anyway, and switching means a repo-wide reformat.

**Done when:** `node --run check`, `node --run lint`, `node --run test` and `npm --prefix scripts run check` pass, `tsx` is gone, and the scripts run under plain `node`.

---

## Chunk 0.5: Strict TypeScript

> **Status: done.**

**Why now:** chunk 0 left two holes in the type check. TypeScript 7 makes `strict` the default, but `scripts/tsconfig.json` sets `"strict": false` to keep the scripts checked as loosely as before. The root `tsconfig.json` has `strict: true` but turns off `noImplicitAny`, so untyped parameters and variables in runtime code are silently `any`. Closing both before chunk 1 means every later chunk writes its code against strict checks, instead of adding to the backlog.

**Scope**

- Remove `"strict": false` from `scripts/tsconfig.json` and `"noImplicitAny": false` from `tsconfig.json`. No tsconfig turns off a strict option afterwards. `tests/tsconfig.json` is already strict.
- Fix the errors by adding types, not by loosening:
  - **Runtime code** (36 errors when chunk 0 landed, in `core/` and `pages/`): untyped parameters, variables that start as `null` or `{}`, and lookups in plain objects used as maps. Fix with JSDoc (`@param`, `@type {?X}`, `@type {Object<string, X>}`). Only comments change, so the code the TV runs is the same.
  - **Scripts** (25 errors): untyped callback parameters, `catch` variables that are `unknown`, values that may be `undefined` in `scrape.ts`, and no types for `jsdom`. Where a value can really be missing, handle it (for example, throw an error that names the show or episode) rather than asserting it away with `!`. There is no `@types/jsdom` for jsdom 29. Use `@types/jsdom` 28 if it fits what `scrape.ts` uses, or else a small `declare module 'jsdom'` covering only that.
- `any` stays only where a value really has no type here: the `BS` namespace (typed in chunk 8 at the earliest, if ever) and the hls.js instance. Each such `any` has a comment saying why. No `@ts-ignore` or `@ts-expect-error`.

**Tests**

- No new tests. `node --run check` and `npm --prefix scripts run check` are the test.
- Run `node --run delete-duplicates` in full (`shows.json` must come out unchanged), `node --run scrape` far enough to see it start, and `node --run download-show` far enough to see the list of shows.
- Runtime changes are JSDoc only, so the existing tests pass unchanged and screenshots are pixel-identical.

**`AGENTS.md`:** say that every tsconfig is strict, and that type errors are fixed with types, never by turning a strict option off.

**Done when:** no tsconfig turns off a strict option, all checks and tests pass, and the scripts run as before.

---

## Chunk 1: Loading

> **Status: done.** The old startup function `BS.load(app)` in `core/app.js` was renamed `BS.loadApp(app)` to free the name.

**Why first:** every later chunk adds or moves component and page files. This chunk makes that a one-line change in `index.html` and moves each component's styles in with its markup.

**`BS.load`** (in `core/templates.js`, which keeps its name until chunk 8)

- `BS.load(fileName)` replaces `BS.templates.register(url)`. It resolves `fileName` relative to the calling script's URL through `document.currentScript`, so it must be called while the script first runs, at the top of the file. It throws if called later.
- At startup, every loaded `.html` file is parsed, and everything at its top level is used:
  - each `<template>` is stored by its id, as now
  - each `<style>` is added to `<head>`
  - anything else (only the icon sprite, from chunk 2) is added to the end of `<body>`
- Styles and other content are added in the order the files were registered, which is the `<script>` order in `index.html`. The cascade order is therefore core, components, pages, whatever order the requests finish in.
- Loading, the timeout and the load-error screen stay as they are.

**Moving styles**

- Move `components/tile/tile.css`, `components/quality-select/quality-select.css`, `pages/show/show.css` and `pages/episode/episode.css` into a `<style>` at the top of the matching `.html` file, and delete the `.css` files and their `<link>`s.
- `core/base.css` and `core/grid.css` stay stylesheet files for now. The grid moves into a component in chunk 3.

**Tests and tooling**

- Delete `tests/unit/index-html.test.ts` and its description in `AGENTS.md`.
- `tests/unit/chrome38.test.ts` checks the contents of `<style>` elements in `.html` files against the CSS rules, as well as `.css` files. Add a probe to `chrome38-checks.test.ts` with unsupported CSS inside a `<style>` in HTML.
- Update the unit sandbox (`tests/unit/runtime.ts`) and the component test page (`tests/component/mount.ts`) for `BS.load`.
- E2E: a missing component `.html` shows the load-error screen. The existing load-failure test may already cover this.
- Screenshots must be pixel-identical to before.

**`AGENTS.md`:** describe the folder layout (`.js` plus `.html` with `<template>` and `<style>`), `BS.load`, and that adding a component or page is one `<script>` line in `index.html`. Update "Add a component" and "Add a page" under Common Tasks.

**TV check:** the app starts and looks unchanged. This is the first use of `document.currentScript` and of styles added from loaded HTML.

---

## Chunk 2: Icons And Buttons

> **Status: done.** The load-error screen's "Royn aftur" button keeps its old look through a temporary `.status-retry` rule in `base.css`, since the button component's styles may be what failed to load. Chunk 7 replaces it. The Chrome 38 scan now flags plain `href` on `<use>`.

**Why now:** buttons are on every page, the back arrow `⇦` depends on the TV having a font with that character, and neither back button has an accessible name. Later chunks (the grid toolbar, the player controls) build on these.

**New components** (both CSS only, see decision 4)

- `components/icon/`
  - `icon.html` has the hidden SVG sprite, with one `<symbol id="icon-<name>" viewBox="...">` per icon: `back` (a new SVG arrow) and `fullscreen` (moved from `episode.html`). Its `<style>` sizes `.icon` to `1em` and colours it with `currentColor`, so icons follow the button's text size and colour.
  - `icon.js` is `BS.load('icon.html')`.
  - Use: `<svg class="icon" aria-hidden="true" focusable="false"><use xlink:href="#icon-back"></use></svg>`.
- `components/button/`
  - `button.html` has only a `<style>`: `.button` takes over the button rules from `base.css` (padding, colours, border, hover and focus), and the modifier `.button-icon` takes over `button.icon` (a square button that holds only an icon).
  - `button.js` is `BS.load('button.html')`.
  - Use: `<button type="button" class="button">Nulstilla "Sæð"</button>`, and for icon-only buttons `<button type="button" class="button button-icon" aria-label="Aftur" title="Aftur">` holding an icon. Icon-only buttons always have both `aria-label` and `title`, so the remote's focus and screen readers both get a name.

**Pages**

- Show page: the back button becomes an icon button with `back`/`Aftur`, and "Nulstilla Sæð" a `.button`.
- Episode page: back becomes an icon button with `back`/`Aftur`, and fullscreen an icon button with `fullscreen`/`Fullur skíggi`. Remove the inline SVG and the `.fullscreen-*` rules, and their entries in `knownExceptions` in `css-prefix.test.ts`.
- Not-found page: "Aftur til forsíðuna" becomes a `.button`.
- Remove the global `button` rules from `base.css`. Every button now has the `.button` class, except the load-error screen's, which gets its own style in chunk 7 and keeps working until then.

**Tests**

- Component test for `icon`: every symbol in the sprite renders with a non-zero size inside a button.
- Update the e2e tests to find buttons by role and name instead of `.episode-header button.icon` and `.actions button.icon`.

**Visual changes:** the SVG back arrow replaces `⇦`. The icon buttons on the show and episode pages get the same size.

**TV check:** the SVG icons render through `<use xlink:href>`, and focus is visible on every button.

---

## Chunk 3: Tiles And Grid

> **Status: done.** Both tiles now use the front page's look: the title left-aligned above the image, with a small gap. The tile's contents sit in a `<span class="tile-body">`, which is the flex container, because old browsers don't lay out a `<button>` itself as a flex container. On narrow screens the toolbar is left-aligned with the tiles instead of centred.

**Why now:** tiles are what children use most. This chunk makes tiles real buttons, removes the page-specific CSS overrides, replaces the grid's spacer and fixed-width hacks with one layout, and makes "Nulstilla Sæð" keep focus.

**Tile** (`components/tile/`)

- The root element is `<button type="button" class="tile">`. Inside a button only inline content is allowed, so the title is a `<span class="tile-title">`, not an `<h2>`. The image is `<img class="tile-image" alt="">`, since the title already names the tile, and the marker is `<span class="tile-watched">Sæð</span>`.
- `BS.components.tile({ title, image, watched, onActivate })` returns `{ element, setWatched(watched), focus() }`.
- The `<style>` in `tile.html` uses only `.tile*` selectors, so a tile looks the same wherever it is placed. All hover and focus styling for tiles moves here from `base.css`.
- One look for show and episode tiles (decision 10). Remove the `.episode-grid` overrides from `show.html`, including the 50%-width header rules.
- Delete `BS.util.onActivate`.

**Grid** (`components/grid/`, which replaces `core/grid.css`)

- `BS.components.grid({ toolbar?, items })` returns `{ element }`. `toolbar` is an element (or array of elements) shown in a row above the tiles, aligned with the first column.
- Replace the 12 spacer tiles and the `.actions` width media queries with one inner container whose width is a whole number of tile columns at each breakpoint. The container is centred and the tiles flow left-aligned inside it, so the last row and the toolbar line up with no spacers. The tile and column widths live only in `grid.html`'s `<style>`, with a comment that ties them to the tile width in `tile.html`.
- Delete `BS.util.addGridSpacers` and `core/grid.css`.
- `AGENTS.md`'s rule "keep grid.css as its own file" becomes "keep the grid in its own component".

**Pages**

- Add `core/dom.js` with `BS.dom.replace(placeholder, element)`. New DOM helpers go there from now on. The rest of `util.js` moves in chunk 8.
- Home and show pages build their tiles with `grid(...)` and put it in place of a placeholder. The show page passes its back and "Nulstilla Sæð" buttons from its template as the toolbar. `show.html` should end up with no `<style>`.
- "Nulstilla Sæð" calls `tile.setWatched(false)` on each tile instead of `router.refresh()`, so the page isn't rebuilt and focus stays on the button.
- Remove the unused `.episode-grid .header` rule.
- Every selector in `tile.html` and `show.html` starts from a `.tile*` or `.show*` class: the tile's `.grid*`, `.header` and `.watched` become `.tile*`, the grid's classes are `.grid*` in `grid.html`, and the show page's `.actions` and `.episode-grid` are gone (the toolbar replaces `.actions`). Delete their entries in `knownExceptions`.

**Tests**

- Update the tile component tests: it's a `<button>`, has `alt=""`, and `setWatched` toggles the marker.
- Add grid component tests: tiles in order, the toolbar sits before the tiles.
- E2E: after "Nulstilla Sæð", the button still has focus and no tile shows "Sæð".
- Screenshots at all four widths, with the before/after shown for review, because the tile look changes.

**TV check:** tiles look right as buttons, the focus ring shows, and the grid lines up at the TV's resolution.

---

## Chunk 4: Page Lifecycle And Focus

**Why now:** after selecting a tile, focus currently lands on nothing, so the child has to start over from the top of the page. This is the biggest remaining remote UX problem, and it needs the tile and button changes from chunks 2 and 3.

**Page lifecycle**

- The router clears `root` before calling a route's `render`. Remove `BS.util.clearElement(root)` from every page.
- `BS.dom.setTitle(...parts)` joins its arguments with `' - '` and adds `'Barnasendingar'` at the end. Pages call it instead of building `document.title` themselves. That fixes the duplicated title string in `episode.js`.

**Focus**

- Each page focuses its main element at the end of `render`:
  - **Home:** the tile of the show you came back from, otherwise the first tile.
  - **Show:** the tile of the episode you came back from, otherwise the first unwatched episode, otherwise the first tile.
  - **Episode:** the video, so OK/Enter controls playback when the player isn't fullscreen.
  - **Not-found:** the "Aftur til forsíðuna" button.
- "The tile you came back from" lives in the page module: home remembers the last show it opened, and the show page the last episode it opened. That keeps the router generic.
- After autoplay moves on to the next episode, going back to the show focuses the episode that was playing last.

**Tests**

- E2E, one test per page: the expected element has focus after navigating there, including coming back from a show and from an episode.

**TV check:** the focus position after each navigation, using only the remote.

---

## Chunk 5: Select

**Why here:** small, but the player in chunk 6 builds on it.

**New component** (`components/select/`, CSS only, see decision 4)

- `select.html` has only a `<style>` for `.select-label` and `.select`: the styles from `quality-select.css` (by now in `quality-select.html`), plus `select:focus` from `base.css`.
- `select.js` is `BS.load('select.html')`.
- Use: `<label class="select-label" for="...">` and `<select class="select" id="...">`, written into the template that needs them.

**Quality select** (`components/quality-select/`)

- Keeps its markup in `quality-select.html`, using the `select` classes, and drops its own styles. The wrapper's `.quality-control` becomes `.quality-select`, and any layout it still needs (such as `margin-left: auto`) stays in `quality-select.html` under that name. Delete its entry in `knownExceptions`.
- Only the level labels ("720p", "800 kbps", "Góðska 3") and the rule that "Auto" is `-1` remain in its JS. Its public API (`setLevels`, `onChange(level)`, `destroy`) stays the same.

**Tests**

- The existing quality-select component tests must pass unchanged.

---

## Chunk 6: Player

**Why here:** `episode.js` is the most complex file, and it mixes page logic with video logic. This chunk separates them without changing behaviour. It comes after the UX chunks because it changes nothing a child sees, but playback carries the most risk, so it gets its own careful chunk.

**New component** (`components/player/`)

- `player.html` has the wrapper, the `<video>` and a message element, and a `<style>` that takes over the `.player-*` rules from `episode.html`. Delete their entries in `knownExceptions`, which leaves it empty.
- `BS.components.player({ onEnded, onLevels })` returns:
  - `element`
  - `load({ src, poster })` loads a new source into the same `<video>` element, which keeps fullscreen between episodes
  - `showMessage(text)`
  - `setLevel(index)`
  - `requestFullscreen()`
  - `focus()`
  - `destroy()`
- The player owns: hls.js setup and teardown, recovery from fatal errors, the fallback to the browser's own HLS support, the "Hesin kaga dugir ikki at spæla video." message, starting playback and requesting fullscreen once the stream is ready.
- The player knows nothing about KVF, shows or episodes. It takes a URL.
- `BS.util.play` and `BS.util.requestFullscreen` move into the player.

**Data**

- `BS.data.playlistUrl(mediaId)` builds the `vod.kringvarp.fo` URL.
- `BS.data.getNextEpisode(show, episode)` replaces `getEpisodeIndex` and `show.episodes[index + 1]` in the episode page.

**Episode page**

- Its template has the header (back and fullscreen icon buttons, titles, a placeholder for `qualitySelect`) and a placeholder for the `player`.
- Handles only the page's own concerns: the title, marking the episode watched, and moving on to the next episode (address change plus `player.load`). An episode without video uses `player.showMessage('Hesin parturin hevur einki video.')`.

**Tests**

- Component tests for the player using the fake HLS playlist that `tests/e2e/app.ts` uses (moved somewhere shared): `onLevels` fires with the levels, `load` reuses the same `<video>`, `showMessage`, `destroy` stops everything.
- Unit tests for `playlistUrl` and `getNextEpisode`.
- All existing playback e2e tests pass unchanged.

**TV check:** required. Play an episode, let it run into the next one (it should stay fullscreen), change quality, and go back.

---

## Chunk 7: Boot Screens

**Why here:** independent of the UI chunks. The current screens work, so this is about isolation, not a fix.

**Scope**

- `index.html` contains two static screens next to `#app`: "Lesur barnasendingar..." (visible from the start) and the load-error screen (`hidden`), with its message and a plain `<button>` "Royn aftur". Their styles are a `<style>` in `index.html`, next to the markup.
- `public/boot/boot.js` drives them, and loads before `core/`. It uses only the DOM. It has no dependency on `BS.load`, `BS.util`, templates, components or the router. `BS.boot.showLoading()`, `BS.boot.showError(onRetry)` (shows the screen and focuses the button) and `BS.boot.hide()`.
- `core/app.js` uses `BS.boot` instead of building the screens itself. Delete `renderLoadError`, `BS.util.renderStatus`, and the `.status-message` and `.status-retry` rules used only by them. The not-found page gets its own `<style>` if it still needs one.

**Tests**

- The existing loading e2e tests pass. Add one that checks "Lesur barnasendingar..." shows while `shows.json` is slow.

**TV check:** turn off the network, or block the data, and check the error screen and the retry button.

---

## Chunk 8: Core Cleanup

**Why last:** by now the earlier chunks have removed most of `util.js`, so this chunk only tidies what is left, without moving code twice.

**Scope**

- Split the rest of `util.js`: the DOM helpers (`el`, `clearElement`) go to `core/dom.js`, `getText`/`getJson` to `core/http.js`, and `logError` to wherever it is used most (probably `core/app.js`). Delete `util.js`.
- Rename `core/templates.js` to `core/load.js` if it reads better now that it mainly holds `BS.load`, and make `BS.templates.add` private.
- **Data owns its state:** `BS.data.load(callback)`, `getShows()`, `getShow()`, `getEpisode()`, kept private inside `data.js`. Remove the unused `episodeByShowTitleAndTitle` index. Make `getEpisode` use an index if that is simpler, or a loop. Delete `BS.state` completely.
- `watched.js`: make `getAll`/`saveAll` private, and drop `clearWatched`'s unused return value. The stored format stays the same; the unit test guards that.
- Each module creates its own namespace. `app.js` no longer lists them, and `current` becomes `BS`.
- `base.css` keeps only global styles: page, typography, `main`, `h1` and the shared focus ring. Delete the unused `a` rules. Add a comment at the top listing the colour palette and the breakpoints (785, 520 and 420 px), since CSS custom properties aren't available on the TV.

**Tests**

- Update the unit tests for the new data and HTTP modules.
- Screenshots should be pixel-identical to before this chunk.

---

## After The Plan

When every chunk has landed, mark this document as implemented, like [`vanilla-spa-migration-plan.md`](vanilla-spa-migration-plan.md), and check that `AGENTS.md` describes the final structure: the component list (which are CSS only and which are factories), `core/` modules, `BS.load`, boot screens and focus rules.
