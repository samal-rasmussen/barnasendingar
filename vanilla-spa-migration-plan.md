# Vanilla SPA Migration Plan

## Goal

Replace the current SvelteKit app with a no-build, plain HTML/CSS/JavaScript SPA that supports Chrome 38-era smart TV browsers.

The runtime app should have no framework, no ES modules, no TypeScript, no bundler, and no generated client bundle. It should load with ordinary `<script>` and `<link>` tags from static files.

The scraper and development tooling may still use modern Node.js and TypeScript.

## Agreed Decisions

- Use one `index.html` with hash-based client-side routing.
- Keep the current three-view user flow:
  - front page: all shows
  - show page: episodes for one show
  - episode page: video player with autoplay-next and watched tracking
- Support Chrome 38 as the compatibility baseline.
- Write runtime JavaScript in ES5 style:
  - `var` and `function`
  - no `let`, `const`, arrows, classes, template literals, destructuring, spread, modules, `async`, or `fetch`
- Use a single global namespace: `window.BS`.
- Use reusable helper functions instead of monkey-patching or polyfilling built-ins.
- Load `shows.json` with an `XMLHttpRequest` wrapper.
- Keep the watched `localStorage` format identical:
  - key: `watched`
  - shape: `{ [showTitle]: { [episodeSortKey]: true } }`
- Keep `grid.css` as its own file.
- Vendor `hls.js@0.14.17`, preferably the light minified build.
- Replace Video.js with `hls.js` plus native `<video controls>`.
- Drop skip-forward and skip-back controls.
- Add a quality selector outside the native controls, close to the player UI.
- Delete SvelteKit/Svelte/Vite frontend code and dependencies after the vanilla app is in place.
- Keep type checking via `// @ts-check` and JSDoc, but do not add a runtime build step.

## Target File Layout

```text
vercel.json
package.json
tsconfig.json
eslint.config.js

public/
  index.html
  assets/
    shows.json
  css/
    style.css
    grid.css
    player.css
  js/
    app.js
    router.js
    data.js
    util.js
    watched.js
    views/
      home.js
      show.js
      episode.js
    vendor/
      hls.light.min.js

scripts/
  package.json
  package-lock.json
  scrape.ts
  delete_duplicates.ts
  download-show.ts
  keepawake.ts
  shared-types.d.ts
  tsconfig.json
```

Notes:

- `public/assets/shows.json` replaces the current bundled import from `src/lib/assets/shows.json`.
- `public/js/vendor/hls.light.min.js` is loaded before the app code and exposes `window.Hls`.
- The final deployed site is the `public/` directory, not a generated `dist/` directory.
- Do not add a frontend build step. Vercel should serve the committed static files directly from `public/`.
- Keep source/tooling files outside `public/` so they are not served as public assets.

## Runtime Architecture

Use one global namespace:

```js
window.BS = {
  state: {},
  util: {},
  data: {},
  watched: {},
  router: {},
  views: {}
};
```

Suggested startup sequence:

1. `public/index.html` loads vendor scripts and app scripts in dependency order.
2. `BS.data.loadShows(callback)` loads `/assets/shows.json` with XHR.
3. Store shows and indexes on `BS.state`.
4. `BS.router.start()` listens to `hashchange` and renders the current route.
5. Each render replaces the contents of a single root element, for example `#app`.

Avoid hidden framework-like complexity. Rendering can be explicit DOM construction with `document.createElement`, `appendChild`, `setAttribute`, and `textContent`.

## Hash Routes

Use compact, predictable hash routes:

```text
#/
#/sending/<encoded-show-title>
#/sending/<encoded-show-title>/partur/<encoded-episode-title>
```

Implementation notes:

- Encode route segments with `encodeURIComponent`.
- Decode route segments with `decodeURIComponent`.
- If a show or episode is missing, render a simple not-found state with a back/home button.
- On back from the show page, use `history.back()` if there is app navigation history; otherwise route to `#/`.
- Keep route helpers centralized in `router.js` so view files do not hand-build hashes differently.

## Data Loading

Create a small XHR wrapper in `data.js` or `util.js`:

```js
BS.util.getJson = function (url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return;
    if (xhr.status >= 200 && xhr.status < 300) {
      callback(null, JSON.parse(xhr.responseText));
      return;
    }
    callback(new Error('Could not load ' + url));
  };
  xhr.send();
};
```

Use browser caching normally. Do not inline `shows.json`.

Build lookup indexes after load:

- `showByTitle`
- optionally `episodeByShowTitleAndTitle`

Use plain objects and `for` loops.

## Views

### Home View

Source behavior: `src/routes/+page.svelte`

Responsibilities:

- Set `document.title = 'Barnasendingar'`.
- Render `<h1>Barnasendingar</h1>`.
- Render all shows from `BS.state.shows`.
- Each tile routes to the show page hash.
- Preserve current tile content: title and poster image.

### Show View

Source behavior: `src/routes/sending/[showTitle]/+page.svelte`

Responsibilities:

- Render the selected show's title.
- Render back button.
- Render `Nulstilla "Sæð"` button.
- Render all episodes in the order present in `shows.json`.
- Show `Sæð` overlay when `watched[show.title][episode.sortKey] === true`.
- Clicking an episode routes to the episode page hash.

Keep the current watched reset behavior: delete only that show's watched map and re-render the show page.

### Episode View

Source behavior: `src/routes/sending/[showTitle]/partur/[episodeTitle]/+page.svelte`

Responsibilities:

- Render selected episode title/context outside or near the video.
- Render native `<video controls autoplay>`.
- Use `hls.js` to attach the HLS playlist:

```text
https://vod.kringvarp.fo/redirect/video/_definst_/smil:smil/video/<mediaId>.smil?type=m3u8
```

- Request fullscreen after initialization if available.
- Mark the episode watched on `ended`.
- Advance to the next episode in the same show after `ended`.
- If there is no next episode, stay on the ended video.
- Clean up the previous `Hls` instance before loading another episode or leaving the view.

## Player And Quality Selector

Use `hls.js@0.14.17` plus native video controls.

Plan:

1. Load `hls.light.min.js` before app scripts.
2. Create `new Hls({ enableWorker: false })` if needed for smart TV stability.
3. `hls.loadSource(playlistUrl)`.
4. `hls.attachMedia(videoElement)`.
5. On `Hls.Events.MANIFEST_PARSED`, populate a quality `<select>`.
6. Add an `Auto` option with value `-1`.
7. For fixed quality options, use `hls.levels[i].height` when present, falling back to bitrate labels.
8. On select change, assign `hls.currentLevel = Number(select.value)`.

The selector cannot be placed inside native video controls. Keep it visually attached to the player, likely as a small overlay near the top or bottom of the player wrapper. Since we are staying close to native controls, do not build a full custom control bar unless the external selector is unusable on the target TV.

Fullscreen caveat:

- The quality selector is just an external `<select>` and is allowed to be hidden during native fullscreen.
- Fullscreen the `<video>` element directly when possible. Do not add wrapper fullscreen or custom fullscreen controls unless real-device testing proves native fullscreen unusable.

## CSS Plan

Keep `grid.css` separate.

Chrome 38 constraints:

- Use flexbox, not CSS Grid.
- Do not use CSS custom properties.
- Do not use flex `gap`.
- Do not use `aspect-ratio`.
- Do not use `place-items`.
- Avoid `color-scheme`.

Current `src/routes/grid.css` is already close:

- It uses flexbox and padding rather than `gap`.
- It uses spacer elements to left-align the last row.
- It has mobile media queries that can be carried over.

Migration tasks:

- Move global layout from `src/routes/style.css` and `src/routes/+layout.svelte` into `css/style.css`.
- Move player-specific CSS into `css/player.css`.
- Replace Svelte custom element selectors such as `actions` and `watched` with classes like `.actions` and `.watched`.
- Keep the old-school `.grid-spacer` approach unless implementation reveals a simpler Chrome 38-safe layout.

## Type Checking

Runtime app files remain plain JavaScript. Use JSDoc for type checking:

```js
// @ts-check

/**
 * @typedef {import('../../scripts/shared-types').Show} Show
 * @typedef {import('../../scripts/shared-types').Episode} Episode
 */
```

That import path is correct for files directly under `public/js/`; use `../../../scripts/shared-types` for files under `public/js/views/`.

Use a root `tsconfig.json` with:

- `allowJs: true`
- `checkJs: true`
- DOM libs
- no emit
- includes for `public/js/**/*.js` and `scripts/shared-types.d.ts`

Keep `scripts/tsconfig.json` for Node scripts.

## Package And Scripts Plan

Root `package.json` should describe static app validation, not frontend building.

Possible root scripts:

```json
{
  "scripts": {
    "serve": "python3 -m http.server 5173 --directory public",
    "check": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write .",
    "scrape": "npm --prefix scripts run scrape",
    "delete-duplicates": "npm --prefix scripts run delete-duplicates",
    "download-show": "npm --prefix scripts run download-show"
  }
}
```

Vercel should also be configured for a framework-free static deployment from `public/`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "buildCommand": null,
  "outputDirectory": "public"
}
```

Because the SPA uses hash routes, a rewrite is not required for normal app navigation; the browser never sends the hash to the server. If we want unknown non-hash paths to land on the app, add this without introducing a build step:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Move scraper dependencies into `scripts/package.json`:

- `tsx`
- `jsdom`
- `p-queue`
- `cli-progress`
- `@types/cli-progress`
- `@types/node`

Root dev dependencies can keep only the tools needed to validate/edit the static app:

- `typescript`
- `eslint`
- `@eslint/js`
- `globals`
- `prettier`

Remove SvelteKit/Vite/runtime player dependencies from root:

- `@sveltejs/adapter-static`
- `@sveltejs/kit`
- `svelte`
- `svelte-check`
- `vite`
- `video.js`
- `videojs-mobile-ui`
- Svelte ESLint/prettier plugins unless still needed for history files during transition

## Implementation Phases

### Phase 1: Compatibility Reference

- Add or verify `chrome38-features.md` in the repo root.
- Use it as the compatibility checklist during implementation.

### Phase 2: Static Shell

- Add `public/index.html`.
- Add `public/css/style.css`, `public/css/grid.css`, and `public/css/player.css`.
- Add `public/js/app.js`, `public/js/util.js`, `public/js/data.js`, `public/js/router.js`, and empty view modules loaded as plain scripts.
- Wire startup, XHR JSON loading, and an initial loading/error state.

### Phase 3: Data And Watched Helpers

- Move `shows.json` to `public/assets/shows.json`.
- Implement `BS.data.loadShows`.
- Implement show lookup indexes.
- Port `src/lib/watched.ts` to `public/js/watched.js` in ES5, preserving storage format.

### Phase 4: Home And Show Views

- Port the front page grid.
- Port the show episode grid.
- Port watched overlay and clear-watched behavior.
- Verify hash navigation, refresh on deep hash, and back behavior.

### Phase 5: Player View

- Vendor `hls.light.min.js@0.14.17` under `public/js/vendor/`.
- Implement native video playback with hls.js.
- Add quality selector.
- Implement fullscreen request.
- Implement watched-on-ended and autoplay-next.
- Implement HLS cleanup on route changes.

### Phase 6: Tooling Cleanup

- Replace root package scripts.
- Move scraper dependencies into `scripts/package.json`.
- Update `tsconfig.json` for checked JavaScript.
- Simplify `eslint.config.js` for plain JS plus Node scripts.
- Update `.prettierignore` and `.gitignore` if needed.
- Update `vercel.json` to serve `public/` with `framework: null`, `buildCommand: null`, and `outputDirectory: "public"`.
- Delete SvelteKit/Vite files and directories:
  - `src/app.html`
  - `src/app.d.ts`
  - `src/routes/**`
  - `src/lib/watched.ts`
  - Svelte player plugin files
  - `svelte.config.js`
  - `vite.config.ts`

Keep or move vendored Luxmty files only if still useful. The current plan drops Video.js and its skin, so those files should probably be removed.

### Phase 7: Verification

Run local checks:

- `npm run check`
- `npm run lint`
- Serve the static app with a simple HTTP server.
- Verify:
  - `#/` loads all shows
  - show routes survive refresh
  - episode routes survive refresh
  - watched overlay appears after an episode ends
  - clear watched works
  - autoplay-next advances correctly
  - quality selector is populated from HLS levels
  - app still works when `localStorage.watched` is absent or malformed

Manual smart-TV verification:

- App loads on Chrome 38 target.
- Grid navigation is usable with the TV remote.
- Video starts.
- Quality selector can be operated.
- Ended episode marks watched.
- Autoplay-next works.

## Main Risks

- `hls.js@0.14.17` may still hit target-TV MSE quirks with KVF streams.
- Native video controls differ by TV browser and may make the external quality selector awkward.
- Native fullscreen will hide the external quality selector; this is accepted unless real-device testing shows it blocks normal use.
- Remote-control focus behavior may need explicit `tabindex`, focus styles, and key handling.
- Vercel static deployment should serve `public/` directly with no build command; verify with a preview deployment.

## Recommended First Implementation Step

Start by building the static shell plus data load:

1. `public/index.html`
2. `public/css/style.css`
3. `public/css/grid.css`
4. `public/js/app.js`
5. `public/js/util.js`
6. `public/js/data.js`
7. `public/js/router.js`
8. `public/js/views/home.js`

That proves the no-build app shape and the Chrome 38-safe rendering style before touching the higher-risk player work.
