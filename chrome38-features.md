# Chrome 38 Browser Support Reference

This project must run on an old smart TV with **Chrome 38** (shipped October 7, 2014; Blink with V8 ~3.28).

As a baseline mental model: it's roughly **ES5 + a partial slice of ES6**, with most HTML5 APIs but missing the post-2015 modern web platform.

Use this document as a reference while implementing to make sure we stay backwards compatible.

## JavaScript

### ✅ Available

- **Full ES5**: strict mode, `Array.prototype` methods (`forEach`, `map`, `filter`, `reduce`, `every`, `some`, `indexOf`), `Object.keys/defineProperty/create/freeze`, `JSON`, getters/setters, `Function.prototype.bind`.
- **ES6 — partial subset enabled by default in 38**:
  - `Map`, `Set`, `WeakMap`, `WeakSet`
  - `Symbol` (basic)
  - Iterators and `for...of`
  - `Math.sign`, `Math.log10`, `Math.trunc`, `Math.cbrt`, etc.
  - `Number.isFinite`, `Number.isInteger`, `Number.isNaN`, `Number.EPSILON`
  - `String.prototype.startsWith/endsWith/includes/repeat`
  - `Object.is`
  - Octal (`0o`) and binary (`0b`) literals
- **Promises** (shipped in Chrome 32).
- **Typed Arrays**, `ArrayBuffer`, `DataView`.
- **Proxy** — partial (better in later versions).
- **`Object.observe`** (Chrome 36; later removed in Chrome 50 — be aware if you ever rely on it).
- Web APIs: `XMLHttpRequest` (incl. `responseType`), `FileReader`, `Blob`, `URL.createObjectURL`, `FormData`, `crypto.getRandomValues`, `requestAnimationFrame`, `MutationObserver`, `postMessage`, Web Workers, Shared Workers, Web Sockets, Server-Sent Events / `EventSource`, IndexedDB, WebSQL (deprecated but present), Application Cache.
- **WebGL 1.0**, Canvas 2D (incl. `toBlob`), Web Audio API, WebRTC (`getUserMedia`, `RTCPeerConnection`), Geolocation, Page Visibility, History API (`pushState`).
- **New in 38 specifically**: Encoding API (`TextEncoder`/`TextDecoder`), Network Information API, Screen Orientation API, `File` constructor.

### ❌ Not available

- **Arrow functions** (Chrome 45)
- **`class` syntax** (Chrome 42 behind flag, 49 unflagged)
- **`let` / `const`** unflagged at top level (Chrome 41/49 — in 38 they exist but with quirks; assume unsafe without a flag)
- **Template literals** (Chrome 41)
- **Default / rest / spread parameters** (Chrome 49 / 46)
- **Destructuring** (Chrome 49)
- **Generators (`function*`)** (Chrome 39 — *just* missed it)
- **`Object.assign`** (Chrome 45)
- **`Array.from`, `Array.of`, `Array.prototype.find/findIndex/includes`** (Chrome 45/47)
- **ES Modules / `import`/`export`** (Chrome 61)
- **`async`/`await`** (Chrome 55)
- **`fetch` API** (Chrome 42) — use XHR
- **Service Workers** (Chrome 40)
- **Web Animations API** (Chrome 36 partial, full 84)
- **`IntersectionObserver`** (Chrome 51), `ResizeObserver` (Chrome 64)
- **Pointer Events** (Chrome 55)
- **Push API**, Background Sync, Payment Request, Web Share, WebUSB, WebBluetooth — all later
- **WebGL 2.0** (Chrome 56)
- **WebAssembly** (Chrome 57)
- **Custom Elements v1 / Shadow DOM v1** — only v0 prefixed/experimental versions exist
- **BigInt**, optional chaining `?.`, nullish coalescing `??`, logical assignment — all years later

## HTML

### ✅ Available

- All HTML5 sectioning/semantic elements: `<header>`, `<footer>`, `<nav>`, `<article>`, `<section>`, `<aside>`, `<main>`, `<figure>`/`<figcaption>`, `<time>`, `<mark>`.
- `<video>`, `<audio>`, `<track>`, `<source>`, `<canvas>`, `<svg>` inline, MathML (partial).
- `<picture>` and `srcset` / `sizes` — `<picture>` is **new in 38**.
- Form features: `<datalist>`, `<output>`, `<progress>`, `<meter>`, most `input[type=...]` (`email`, `url`, `number`, `range`, `date`, `time`, `color`, `search`, `tel`), `placeholder`, `autofocus`, `pattern`, `required`, `min`/`max`/`step`, `formnovalidate`, `multiple`.
- `contenteditable`, `draggable`, drag-and-drop API, `data-*` attributes / `dataset`.
- `<template>`, **HTML Imports** (v0 — later removed), Custom Elements v0, Shadow DOM v0 (mostly behind a flag in 38; v0 fully default ~Chrome 53).
- `<dialog>` was **not** in 38 (Chrome 37 added it behind flag, default Chrome 37 actually — but treat as unreliable; safer to assume no).

### ❌ Not available

- `<dialog>` reliably (use a polyfill).
- `loading="lazy"` (Chrome 76).
- `inputmode` (Chrome 66).
- Web Components v1 APIs.

## CSS

### ✅ Available

- **Flexbox** (modern unprefixed syntax, since Chrome 29). Solid for SmartTV layouts.
- **Transitions, animations, 2D and 3D transforms** (mostly unprefixed, but `-webkit-` prefixed versions are safer on TV WebKit forks).
- Media queries, including `min-width`, `orientation`, `resolution`.
- Gradients (linear, radial, repeating), `border-radius`, `box-shadow`, `text-shadow`, multiple backgrounds, `background-size`/`background-clip`/`background-origin`.
- Color: `rgba()`, `hsla()`, opacity.
- `calc()`, `@supports`, `:not()`, `:nth-child()`, `:nth-of-type()`, `:checked`, `:target`, `:empty`, `::before`/`::after`, attribute selectors.
- `@font-face`, `font-feature-settings`, basic web fonts. WOFF and WOFF2 (WOFF2 since Chrome 36).
- `column-count`, `column-width`, `column-gap`, `break-inside`.
- `pointer-events`, `cursor`, `box-sizing`, `outline`.
- `will-change` (Chrome 36).
- `object-fit` / `object-position` (Chrome 31/32) — useful for TV layouts.
- Filters (`filter: blur()`, `grayscale()`, etc., Chrome 18+ with `-webkit-`).
- CSS regions and shapes — partial / prefixed; treat as unreliable.

### ❌ Not available

- **CSS Grid Layout** (Chrome 57)
- **CSS Custom Properties / variables** (`--var`, `var()`) (Chrome 49)
- **`position: sticky`** (Chrome 56 unprefixed)
- **`display: contents`** (Chrome 65)
- **CSS containment** (`contain`) (Chrome 52)
- **`clip-path` with SVG references** is partial; basic shapes from Chrome 55
- **Logical properties** (`margin-inline-start`, etc.) (Chrome 69+)
- **`gap` for flexbox** (Chrome 84) — `gap` for grid is moot since no grid
- **`aspect-ratio`** (Chrome 88)
- **`:is()`, `:where()`, `:has()`** — all much later
- **Container queries**, **subgrid**, **cascade layers** — all far later
- **Color level 4** (`color-mix`, `oklch`, etc.)
- **Backdrop filter** (Chrome 76 unprefixed)
- **Scroll snap** modern syntax (Chrome 69)
