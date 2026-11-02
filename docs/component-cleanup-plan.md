# Component Cleanup Plan

> **Status: planned.** Nothing here is implemented yet. Update the status of each chunk as it lands.

## Goal

Make the runtime code more cohesive and encapsulated. Each piece of UI should live in one component that owns its markup, styles and behaviour, and pages should only put components together and wire up the data. Along the way, fix the UX problems the audit found, mainly around focus and the TV remote.

Small visual and UX improvements are expected. A change must never make anything worse than it is now: no regressions in layout, behaviour, accessibility or TV compatibility.

## How The Work Is Split

The work is split into eight chunks. Each chunk:

- is one cohesive change that can be reviewed, committed and deployed on its own
- leaves the app fully working, with `node --run check`, `node --run lint` and `node --run test` passing
- updates `AGENTS.md` in the same chunk when it changes how things are done
- adds or updates tests in the right tier (unit, component or e2e)

The chunks are ordered by value and dependencies. The things a child on the TV notices most (buttons, tiles, focus) come first. Foundations that later chunks build on come before those chunks. Internal tidying comes last, once the earlier chunks have removed most of what it would otherwise move around.

| #   | Chunk                    | Depends on | User-visible                              | TV check   |
| --- | ------------------------ | ---------- | ----------------------------------------- | ---------- |
| 1   | Safety net               | –          | No                                        | No         |
| 2   | Icons and buttons        | –          | Yes: SVG back arrow, labelled buttons     | Yes        |
| 3   | Tiles and grid           | 2          | Yes: unified tiles, reset keeps focus     | Yes        |
| 4   | Page lifecycle and focus | 3          | Yes: focus lands on the right thing       | Yes        |
| 5   | Select                   | –          | Small: consistent select styling          | No         |
| 6   | Player                   | 2, 5       | No (behaviour unchanged)                  | Yes, video |
| 7   | Boot screens             | –          | Small: loading and error screens restyled | Yes        |
| 8   | Core cleanup             | 3, 6, 7    | No                                        | No         |

Chunks 5 and 7 have no dependencies and can be moved earlier if that's convenient.

## Decisions

These were settled before writing the plan, or follow from those answers.

1. **Components are JS factories with templates**, as `tile` and `qualitySelect` already are: `BS.components.<name>(options)` returns `{ element, ...methods }`. Pages put a placeholder element with a `data-ref` in their template where a component goes, and swap it for the component's element with `BS.dom.replace(placeholder, element)`. That keeps the page's layout readable in its HTML without wrapper elements.
2. **Buttons are real `<button>` elements**, including tiles. Nothing uses a `div` with `role="button"` any more, and `BS.util.onActivate` is deleted.
3. **All SVG icons live in the `icon` component.** No page or component contains SVG or icon-like text characters such as `⇦`.
4. **The loading and load-error screens are primitive pages**, isolated from everything they are a fallback for. They have their own CSS and JS and use no templates, components, router or `util`. Their markup is static HTML in `index.html`, because that is the only HTML file guaranteed to have loaded when templates or data fail.
5. **There is no shared "message" component.** That idea from the audit is dropped. The boot screens are isolated (decision 4), not-found is an ordinary page, and the player owns its own messages. What's left isn't shared enough to be a component.
6. **One tile look.** Show tiles and episode tiles use the same tile without page-specific overrides. Where the two differ today, pick whichever looks better, and show before/after screenshots for review.
7. **Focus follows the remote.** Every page focuses its main element when it renders, and coming back to a page puts focus back on the tile you came from.

## Rules For Every Chunk

- Follow `AGENTS.md` and [`chrome38-features.md`](chrome38-features.md): ES5 only, no Web Components, no unsupported CSS.
- Component CSS classes are prefixed with the component name (`.tile`, `.tile-title`, `.button`, `.icon-button`). Pages never style a component's insides. If a page needs a different look, the component gets an option for it.
- Before starting, snapshot `public/` as described in `AGENTS.md` and compare screenshots afterwards at 1920, 1100, 700 and 400 px. Anything that isn't pixel-identical must be an intended improvement, and should be shown to the user.
- Prefer finding elements in e2e tests by role and accessible name (`getByRole('button', { name: 'Aftur' })`) over CSS classes.
- Delete what a chunk makes unused, in the same chunk.
- If a chunk turns out bigger than described, split it rather than leaving it half done.

---

## Chunk 1: Safety Net

**Why first:** every later chunk adds or moves component and page files, and forgetting to list one in `index.html` is the easiest mistake to make. This chunk is tiny and protects all the others.

**Scope**

- Add `tests/unit/index-html.test.ts`, which checks that:
  - every `.js` file under `public/core/`, `public/components/` and `public/pages/` has a `<script>` tag in `index.html`, and every `.css` file has a `<link>`
  - every `<script>` and `<link>` in `index.html` points to a file that exists
  - the load order is vendor, core, components, pages, for both scripts and stylesheets
- Document the test in `AGENTS.md`, under Tests.

**Done when:** the test passes on the current code, and fails when an entry is removed or reordered (check that by hand once).

---

## Chunk 2: Icons And Buttons

**Why now:** buttons are on every page, the back arrow `⇦` depends on the TV having a font with that character, and neither back button has an accessible name. Later chunks (the grid toolbar, the player controls) build on these components.

**New components**

- `components/icon/`
  - `icon.html` has one `<template id="icon-<name>">` per icon, containing an `<svg class="icon">`. It starts with `back` (a new SVG arrow) and `fullscreen` (moved from `episode.html`).
  - `BS.components.icon(name)` returns `{ element }`. An unknown name throws.
  - `icon.css` sizes icons to `1em` and colours them with `currentColor`, so they follow the button's text size and colour.
- `components/button/`
  - `button.html`: `<button type="button" class="button">`.
  - `BS.components.button({ text, onActivate, variant? })` returns `{ element, focus(), setDisabled(disabled) }`.
  - `button.css` takes over the button rules from `base.css`: padding, colours, border, hover and focus.
- `components/icon-button/`
  - `BS.components.iconButton({ icon, label, onActivate })` is built on `button` and `icon`.
  - `label` is required. It becomes both `aria-label` and `title`, so the remote's focus and screen readers both get a name.
  - `icon-button.css` takes over `button.icon` from `base.css`.

**Pages**

- Show page: back is `iconButton({ icon: 'back', label: 'Aftur', ... })`, and "Nulstilla Sæð" is `button(...)`.
- Episode page: back is `iconButton` with `'back'`/`'Aftur'`, and fullscreen is `iconButton` with `'fullscreen'`/`'Fullur skíggi'`.
- Not-found page: "Aftur til forsíðuna" is `button(...)`.
- Add `core/dom.js` with `BS.dom.replace(placeholder, element)`. New DOM helpers go there from now on. The rest of `util.js` moves in chunk 8.

**Tests**

- Component tests for `icon` (every icon renders as an SVG; an unknown name throws), `button` (text, click/Enter/Space, `setDisabled`, `focus`) and `iconButton` (accessible name, contains an icon).
- Update the e2e tests to find buttons by role and name instead of `.episode-header button.icon` and `.actions button.icon`.

**Visual changes:** the SVG back arrow replaces `⇦`. The icon buttons on the show and episode pages get the same size.

**TV check:** the SVG icons render, and focus is visible on every button.

---

## Chunk 3: Tiles And Grid

**Why now:** tiles are what children use most. This chunk makes tiles real buttons, removes the page-specific CSS overrides, replaces the grid's spacer and fixed-width hacks with one layout, and makes "Nulstilla Sæð" keep focus.

**Tile** (`components/tile/`)

- The root element is `<button type="button" class="tile">`. Inside a button only inline content is allowed, so the title is a `<span class="tile-title">`, not an `<h2>`. The image is `<img class="tile-image" alt="">`, since the title already names the tile, and the marker is `<span class="tile-watched">Sæð</span>`.
- `BS.components.tile({ title, image, watched, onActivate })` returns `{ element, setWatched(watched), focus() }`.
- `tile.css` uses only `.tile*` selectors, so a tile looks the same wherever it is placed. All hover and focus styling for tiles moves here from `base.css`.
- One look for show and episode tiles (decision 6). Remove the `.episode-grid` overrides from `show.css`, including the 50%-width header rules.
- Delete `BS.util.onActivate`.

**Grid** (`components/grid/`, which replaces `core/grid.css`)

- `BS.components.grid({ toolbar?, items })` returns `{ element }`. `toolbar` is an element (or array of elements) shown in a row above the tiles, aligned with the first column.
- Replace the 12 spacer tiles and the `.actions` width media queries with one inner container whose width is a whole number of tile columns at each breakpoint. The container is centred and the tiles flow left-aligned inside it, so the last row and the toolbar line up with no spacers. The tile and column widths live only in `grid.css`, with a comment that ties them to the tile width in `tile.css`.
- Delete `BS.util.addGridSpacers`.
- `AGENTS.md`'s rule "keep grid.css as its own file" becomes "keep the grid in its own component".

**Pages**

- Home and show pages build their tiles with `grid(...)`. The show page passes its back and "Nulstilla Sæð" buttons as the toolbar. `show.css` should end up empty, so delete it.
- "Nulstilla Sæð" calls `tile.setWatched(false)` on each tile instead of `router.refresh()`, so the page isn't rebuilt and focus stays on the button.
- Remove the unused `.episode-grid .header` rule.

**Tests**

- Update the tile component tests: it's a `<button>`, has `alt=""`, and `setWatched` toggles the marker.
- Add grid component tests: tiles in order, the toolbar sits before the tiles.
- E2E: after "Nulstilla Sæð", the button still has focus and no tile shows "Sæð".
- Screenshots at all four widths, with the before/after shown for review, because the tile look changes.

**TV check:** tiles look right as buttons, the focus ring shows, and the grid lines up at the TV's resolution.

---

## Chunk 4: Page Lifecycle And Focus

**Why now:** after selecting a tile, focus currently lands on nothing, so the child has to start over from the top of the page. This is the biggest remaining remote UX problem, and it needs the tile and button components from chunks 2 and 3.

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

**Why here:** small and independent, but the player in chunk 6 builds on it.

**New component** (`components/select/`)

- `BS.components.select({ id, label, options, value?, onChange })`, where `options` is `[{ value, text }]`. It returns `{ element, setOptions(options, value), setDisabled(disabled), getValue(), destroy() }`.
- It owns the label and select markup and the select CSS: the styles from `quality-select.css`, plus `select:focus` from `base.css`.

**Quality select** (`components/quality-select/`)

- Rebuilt on `select`. Only the level labels ("720p", "800 kbps", "Góðska 3") and the rule that "Auto" is `-1` remain. Its public API (`setLevels`, `onChange(level)`, `destroy`) stays the same.
- Delete `quality-select.html` and most of `quality-select.css`.

**Tests**

- Component tests for `select`: options, value, `onChange` with the chosen value, disabled state, and that the label is linked to the select.
- The existing quality-select tests must pass unchanged.

---

## Chunk 6: Player

**Why here:** `episode.js` is the most complex file, and it mixes page logic with video logic. This chunk separates them without changing behaviour. It comes after the UX chunks because it changes nothing a child sees, but playback carries the most risk, so it gets its own careful chunk.

**New component** (`components/player/`)

- `player.html` has the wrapper, the `<video>` and a message element. `player.css` takes over the `.player-*` rules from `episode.css`.
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

- Puts together a header (back `iconButton`, titles, fullscreen `iconButton`, `qualitySelect`) and a `player`.
- Handles only the page's own concerns: the title, marking the episode watched, and moving on to the next episode (address change plus `player.load`). An episode without video uses `player.showMessage('Hesin parturin hevur einki video.')`.

**Tests**

- Component tests for the player using the fake HLS playlist that `tests/e2e/app.ts` uses (moved somewhere shared): `onLevels` fires with the levels, `load` reuses the same `<video>`, `showMessage`, `destroy` stops everything.
- Unit tests for `playlistUrl` and `getNextEpisode`.
- All existing playback e2e tests pass unchanged.

**TV check:** required. Play an episode, let it run into the next one (it should stay fullscreen), change quality, and go back.

---

## Chunk 7: Boot Screens

**Why here:** independent. The current screens work, so this is about isolation, not a fix.

**Scope**

- `index.html` contains two static screens next to `#app`: "Lesur barnasendingar..." (visible from the start) and the load-error screen (`hidden`), with its message and a plain `<button>` "Royn aftur".
- `public/boot/boot.css` and `public/boot/boot.js` style and drive them. `boot.js` uses only the DOM. It has no dependency on `BS.util`, templates, components or the router. `BS.boot.showLoading()`, `BS.boot.showError(onRetry)` (shows the screen and focuses the button) and `BS.boot.hide()`.
- `core/app.js` uses `BS.boot` instead of building the screens itself. Delete `renderLoadError`, `BS.util.renderStatus` and the `.status-message` rules used only by them. The not-found page gets its own small stylesheet if it still needs one.
- Update the chunk 1 test for the new `boot/` folder (it loads before `core/`).

**Tests**

- The existing loading e2e tests pass. Add one that checks "Lesur barnasendingar..." shows while `shows.json` is slow.

**TV check:** turn off the network, or block the data, and check the error screen and the retry button.

---

## Chunk 8: Core Cleanup

**Why last:** by now the earlier chunks have removed most of `util.js`, so this chunk only tidies what is left, without moving code twice.

**Scope**

- Split the rest of `util.js`: the DOM helpers (`el`, `clearElement`) go to `core/dom.js`, `getText`/`getJson` to `core/http.js`, and `logError` to wherever it is used most (probably `core/app.js`). Delete `util.js`.
- **Data owns its state:** `BS.data.load(callback)`, `getShows()`, `getShow()`, `getEpisode()`, kept private inside `data.js`. Remove the unused `episodeByShowTitleAndTitle` index. Make `getEpisode` use an index if that is simpler, or a loop. Delete `BS.state` completely.
- `watched.js`: make `getAll`/`saveAll` private, and drop `clearWatched`'s unused return value. The stored format stays the same; the unit test guards that.
- `templates.js`: make `add` private.
- Each module creates its own namespace. `app.js` no longer lists them, and `current` becomes `BS`.
- `base.css` keeps only global styles: page, typography, `main`, `h1` and the shared focus ring. Delete the unused `a` rules. Add a comment at the top listing the colour palette and the breakpoints (785, 520 and 420 px), since CSS custom properties aren't available on the TV.

**Tests**

- Update the unit tests for the new data and HTTP modules.
- Screenshots should be pixel-identical to before this chunk.

---

## After The Plan

When every chunk has landed, mark this document as implemented, like [`vanilla-spa-migration-plan.md`](vanilla-spa-migration-plan.md), and check that `AGENTS.md` describes the final structure: the component list, `core/` modules, boot screens and focus rules.
