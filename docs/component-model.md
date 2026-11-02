# Component Model

How UI is split into components and pages in this project, how their files are loaded, and how they fit together. Read this before adding or changing a component or page.

> **Status: target model.** [`component-cleanup-plan.md`](component-cleanup-plan.md) introduces this model chunk by chunk. Loading (`BS.load`, and styles in a `<style>` in each folder's `.html`), the CSS-only `icon` and `button` components, the `tile` and `grid` factory components with `BS.dom.replace`, the page lifecycle and focus rules, and the CSS-only `select` component used by the quality select have landed. Until the other chunks have, the code they touch still works the old way: the player still has its old structure. When a chunk changes the model, update this document in the same chunk. Remove this note when the plan is done.

## Principles

- **Plain HTML, CSS and JavaScript.** No framework, no build step, no component registry, no dependency lists. The runtime rules in `AGENTS.md` and [`chrome38-features.md`](chrome38-features.md) apply to everything here.
- **One folder per component or page.** It owns its markup, styles and behaviour, and nothing outside it reaches into its code. Other folders may only style it from inside their own elements (see [Styles](#styles)).
- **Structure lives in HTML.** Templates hold the markup and static text. JS fills in data, wires up handlers and shows or hides parts.
- **Native elements first.** Buttons are `<button>`, selects are `<select>`. That keeps the TV remote, focus and Enter/OK working without extra code, and the native API (`onclick`, `disabled`, `focus()`, `value`) is the component's API.
- **Adding or removing a folder is one line in `index.html`.**
- **Mistakes fail loudly.** A forgotten `<script>` throws when the code is used, and a missing `.html` file shows the load-error screen at startup.

## Files

```
public/
  index.html                 one <script> per folder, in order: vendor, core, components, pages
  core/base.css              global styles only (the one stylesheet file)
  core/*.js                  shared runtime: loading, templates, router, data, ...
  components/<name>/
    <name>.js                BS.load('<name>.html'), plus the factory if it has behaviour
    <name>.html              <style>, and <template>s or an icon sprite
  pages/<name>/
    <name>.js                BS.load('<name>.html') and BS.pages.<name>
    <name>.html              <style> if needed, and the page's <template>s
```

A component or page `.html` file looks like this:

```html
<style>
	.tile {
		/* ... */
	}
	.tile-title {
		/* ... */
	}
</style>

<template id="tile">
	<button type="button" class="tile">
		<span class="tile-body">
			<span class="tile-title" data-ref="title"></span>
			<img class="tile-image" alt="" data-ref="image" />
		</span>
		<span class="tile-watched" data-ref="watched">Sæð</span>
	</button>
</template>
```

There are no `.css` files for components or pages. Styles go in a `<style>` at the top of the folder's `.html`.

## Loading

`index.html` loads hls.js, the core scripts and then one `<script>` per component and per page. The first statement in each component and page script is:

```js
BS.load('tile.html');
```

`BS.load` resolves the file name relative to the script that calls it, through `document.currentScript`. It therefore only works while the script first runs, at the top of the file, and throws if called later. Moving or renaming a folder doesn't break paths inside it.

At startup, every registered file is fetched with XHR, in parallel with `shows.json`. Each file's top-level content is used like this:

| Top-level element | What happens                                                  |
| ----------------- | ------------------------------------------------------------- |
| `<template id>`   | Stored by id, for `BS.templates.clone(id)`.                   |
| `<style>`         | Added to `<head>`.                                            |
| anything else     | Added to the end of `<body>`. Only the icon sprite uses this. |

Styles and other content are added in the order the files were registered, which is the `<script>` order in `index.html`. The cascade is therefore always `base.css`, then components, then pages, whatever order the requests finish in. If any file fails to load or times out, the load-error screen with "Royn aftur" appears.

## Two Kinds Of Components

Ask one question: does it have behaviour or data of its own?

| Kind         | When                                                                          | Examples                                  | What its folder holds                                 |
| ------------ | ----------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------- |
| **CSS only** | It only looks a certain way. A native element plus classes is enough.         | `button`, `icon`, `select`                | `<style>` (and the sprite, for icons), one-line `.js` |
| **Factory**  | It builds DOM from data, keeps state that changes, or owns outside resources. | `tile`, `grid`, `qualitySelect`, `player` | `<style>`, `<template>`s and a factory function       |

Only make a component for UI that is actually reused, or that is complex enough to need its own folder (like the player).

### CSS-only components

The page writes the markup straight into its own template and uses the component's classes. Nothing is created in JS.

```html
<button type="button" class="button" data-ref="clear">Nulstilla "Sæð"</button>

<button type="button" class="button button-icon" aria-label="Aftur" title="Aftur" data-ref="back">
	<svg class="icon" aria-hidden="true" focusable="false"><use xlink:href="#icon-back"></use></svg>
</button>

<label class="select-label" for="quality-selector">Góðska</label
><select class="select" id="quality-selector"></select>
```

```js
view.refs.back.onclick = function () {
	BS.router.back('home');
};
```

Rules:

- Icon-only buttons always have both `aria-label` and `title`.
- Icons come only from the `icon` component's sprite, as `<symbol id="icon-<name>">`. Use them with `xlink:href`, not `href`, because plain `href` on `<use>` is newer than Chrome 38. No other SVG or icon-like text characters (such as `⇦`) in pages or components.

### Factory components

A factory is a function on `BS.components` that takes an options object and returns an object with its root `element` and methods for anything that changes.

```js
// @ts-check
(function (window) {
	'use strict';

	var BS = /** @type {any} */ (window).BS;

	BS.load('tile.html');

	/**
	 * @param {{ title: string, image: string, watched?: boolean, onActivate: Function }} options
	 */
	BS.components.tile = function (options) {
		var view = BS.templates.clone('tile');

		view.refs.title.textContent = options.title;
		view.refs.image.src = options.image;
		view.element.onclick = function () {
			options.onActivate();
		};

		function setWatched(watched) {
			view.refs.watched.hidden = !watched;
		}
		setWatched(!!options.watched);

		return {
			element: view.element,
			setWatched: setWatched,
			focus: function () {
				view.element.focus();
			}
		};
	};
})(window);
```

Rules:

- **Data in, callbacks out.** Options carry data and callbacks such as `onActivate` or `onChange`. A component never reads `BS.state`, calls the router or knows which page it is on. The page decides what happens.
- **Methods for change, not re-creation.** If something changes after creation (watched state, quality levels, a message), add a method like `setWatched` instead of rebuilding the component.
- **`destroy()` only when needed.** Listeners on the component's own elements go away with the elements. Add `destroy()` only when the component holds something outside itself: an hls.js instance, a timer, a listener on `document` or `window`.
- **Build on native elements**, so focus and Enter/OK work without key handling.

## Templates

- `BS.templates.clone(id)` returns `{ fragment, element, refs }`. `element` is the first element, for single-root templates. `refs` maps each `data-ref` value to its element.
- Template ids are global, so prefix them with the component or page name (`tile`, `show-page`, `episode-player-message`).
- Keep structure and static text in the template. Show and hide parts with `hidden` or by removing them, not by building markup in JS.

## Pages

A page is not a component. It registers itself as `BS.pages.<name>` with a `render` function, and the route table in `core/routes.js` calls it.

```js
BS.load('show.html');

BS.pages.show = {
	render: function (root, show) {
		var view = BS.templates.clone('show-page');
		var tiles = show.episodes.map(function (episode) {
			return BS.components.tile({
				/* ... */
			});
		});

		BS.dom.setTitle(show.title);
		view.refs.back.onclick = function () {
			BS.router.back('home');
		};
		BS.dom.replace(view.refs.grid, BS.components.grid({ items: tiles }).element);

		root.appendChild(view.fragment);
		tiles[0].focus();
	}
};
```

- **Empty root and title:** the router empties `root` before it calls `render`, so pages don't clear it themselves. Pages set the title with `BS.dom.setTitle(...parts)`, most specific part first; it adds `- Barnasendingar` at the end.
- **Placing a factory component:** put a placeholder element with a `data-ref` in the page's template where it goes, and swap it with `BS.dom.replace(placeholder, component.element)`. The page's layout stays readable in its HTML, without wrapper elements.
- **Lists** of components (tiles) are created in JS from the data and handed to the component that lays them out (`grid`).
- **Cleanup:** `render` may return a function, which the router calls when leaving the page. Use it to call `destroy()` on components that have one and to remove listeners on `document` or `window`.
- **Focus:** end `render` by focusing the page's main element, so the remote always has a starting point. Coming back to a page focuses the tile you came from. The page module remembers that item, not the router, which stays generic: the page one level down tells it what is open (`BS.pages.home.rememberShow(show)`, `BS.pages.show.rememberEpisode(show, episode)`), so it is also right after autoplay moves on and after opening a page by its address.
- **Data:** pages get their data from the route (`render(root, show, episode)`) and from `BS.data` and `BS.watched`. Components get it from the page.

## Styles

- Every class is prefixed with its component's name: `.tile`, `.tile-title`, `.button`, `.button-icon`. Page classes are prefixed with the page name.
- Every selector in a folder's `<style>` starts from one of its own classes, so its styles stay inside its own elements. After that, it may name another component's classes to style that component in that place: `.show-toolbar .tile-title` changes only the tiles in the show page's toolbar. A bare `.tile-title` in `show.html` is not allowed. `tests/unit/css-prefix.test.ts` enforces this.
- Reaching into a component this way ties the page to the component's class names. When the look is something the component should offer anyway, give it a modifier class (`.button-icon`) or an option instead.
- `core/base.css` holds only global styles: the page, typography, `main`, `h1` and the shared focus ring.
- No CSS custom properties (the TV lacks them). Repeated values, like colours and breakpoints, are listed in a comment at the top of `base.css`.
- `tests/unit/chrome38.test.ts` scans `<style>` elements as well as `.css` files for unsupported CSS.

## Adding And Removing

- **Add a component:** create `public/components/<name>/` with `<name>.html` and `<name>.js` (starting with `BS.load('<name>.html')`), and add its `<script>` to `index.html` after core and before the pages. A factory component gets a component test.
- **Add a page:** create `public/pages/<name>/` the same way, with `BS.pages.<name>` in the `.js`. Add its `<script>` after the components, and a route in `core/routes.js`.
- **Remove either:** delete the folder and its `<script>` line, and any route.

## Testing

- **Factory components** get component tests (`tests/component/`): what they render for given options, keyboard and click handling, callbacks and methods.
- **CSS-only components** have nothing to test on their own. The pages that use them are covered by e2e tests, which find elements by role and accessible name (`getByRole('button', { name: 'Aftur' })`).
- **Pages** are tested end to end (`tests/e2e/`), not as components.

## Why This Design

These alternatives from other micro-frameworks were considered and rejected:

- **Dependency lists** (`uses: [...]` per component, as in AMD or Angular modules): too verbose for what they buy.
- **Building markup in JS** (RE:DOM, Mithril and VanJS style): moves structure out of the HTML and means rewriting every template.
- **Mounting components from HTML attributes** (Stimulus, Knockout and Riot style): our HTML is built from JSON, so lists are created in JS anyway, and wiring callbacks by string names is more magic than it saves.
- **Reactive state** (ArrowJS, Alpine, petite-vue, Knockout, Vue): the modern ones need `Proxy` or template literals, which the TV lacks, and the app has too little changing state to need it.
- **Tagged-template HTML** (ArrowJS, lit-html, uhtml): needs template literals.
- **A separate `.css` per component, loaded by its script:** works, but a `<style>` in the `.html` is leaner.
- **The script inside the `.html` as well** (single-file components, with the loader running each `<script>`): one file per component, but `tsc` can't type-check JavaScript inside HTML, the linter's ES5 check needs extra setup to reach it, the unit tests and the Chrome 38 scan would have to extract it, and error line numbers and syntax errors become harder to trace. The loader would also be running code itself, which is framework machinery. So the `.js` stays a separate file, loaded by a plain `<script>` tag, even when it is only `BS.load('<name>.html')`.
- **No `.js` for CSS-only components** (`index.html` calling `BS.load` for them directly): saves the one-line files, but gives `index.html` two kinds of entries. One `<script>` per folder is the simpler rule.
