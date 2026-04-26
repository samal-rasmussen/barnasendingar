# Chrome 38 Feature Support Reference

Chrome 38 shipped on October 7, 2014. Treat it as roughly ES5 plus a partial slice of ES6, with many HTML5 APIs but without most post-2015 web platform features.

Use this file as the compatibility checklist while converting the app to a vanilla SPA for the smart TV target.

When in doubt, write to the conservative baseline: ES5 syntax, DOM APIs that existed well before Chrome 38, and CSS that does not require layout features newer than flexbox.

## JavaScript

### Available

- Full ES5:
  - strict mode
  - `Array.prototype.forEach`, `map`, `filter`, `reduce`, `every`, `some`, `indexOf`
  - `Object.keys`, `Object.defineProperty`, `Object.create`, `Object.freeze`
  - `JSON`
  - getters/setters
  - `Function.prototype.bind`
- Partial ES6 subset enabled by default:
  - `Map`, `Set`, `WeakMap`, `WeakSet`
  - basic `Symbol`
  - iterators and `for...of`
  - `Math.sign`, `Math.log10`, `Math.trunc`, `Math.cbrt`
  - `Number.isFinite`, `Number.isInteger`, `Number.isNaN`, `Number.EPSILON`
  - `Object.is`
- Promises.
- Typed arrays, `ArrayBuffer`, `DataView`.
- `Object.observe`, which was later removed in Chrome 50. Do not rely on it.
- Web APIs:
  - `XMLHttpRequest`, including `responseType`
  - `FileReader`, `Blob`, `URL.createObjectURL`
  - `FormData`
  - `crypto.getRandomValues`
  - `requestAnimationFrame`
  - `MutationObserver`
  - `postMessage`
  - Web Workers and Shared Workers
  - WebSockets
  - Server-Sent Events / `EventSource`
  - IndexedDB
  - WebSQL
  - Application Cache
- WebGL 1.0.
- Canvas 2D. Do not rely on `HTMLCanvasElement.toBlob()`.
- Web Audio API.
- WebRTC:
  - `getUserMedia`
  - `RTCPeerConnection`
- Geolocation.
- Page Visibility API.
- History API, including `pushState`.
- New in Chrome 38:
  - Encoding API: `TextEncoder` / `TextDecoder`
  - Screen Orientation API
  - `File` constructor

### Not Available

- `String.prototype.startsWith`, `endsWith`, `includes`, `repeat`.
- Arrow functions.
- `class` syntax.
- Safe unflagged top-level `let` / `const`. Assume unsafe.
- Template literals.
- Default parameters, rest parameters, and spread syntax.
- Destructuring.
- Generators, `function*`.
- `Proxy`.
- `Object.assign`.
- `Array.from`, `Array.of`, `Array.prototype.find`, `findIndex`, `includes`.
- `HTMLCanvasElement.toBlob()`.
- Octal `0o` and binary `0b` literals.
- ES modules / `import` / `export`.
- `async` / `await`.
- `fetch`. Use `XMLHttpRequest`.
- Service Workers.
- Full Web Animations API.
- `IntersectionObserver`.
- `ResizeObserver`.
- Pointer Events.
- Push API.
- Background Sync.
- Payment Request.
- Web Share.
- WebUSB.
- WebBluetooth.
- Network Information API. Some older Chrome-platform notes mention it around Chrome 38, but current compatibility data does not make it safe for this target.
- WebGL 2.0.
- WebAssembly.
- Custom Elements v1 / Shadow DOM v1.
- BigInt.
- Optional chaining `?.`.
- Nullish coalescing `??`.
- Logical assignment operators.

## HTML

### Available

- HTML5 sectioning and semantic elements:
  - `<header>`
  - `<footer>`
  - `<nav>`
  - `<article>`
  - `<section>`
  - `<aside>`
  - `<main>`
  - `<figure>` / `<figcaption>`
  - `<time>`
  - `<mark>`
- Media and graphics:
  - `<video>`
  - `<audio>`
  - `<track>`
  - `<source>`
  - `<canvas>`
  - inline `<svg>`
  - partial MathML
- `<picture>` and `srcset` / `sizes`. `<picture>` is new in Chrome 38.
- Form features:
  - `<datalist>`
  - `<output>`
  - `<progress>`
  - `<meter>`
  - most `input[type=...]`, including `email`, `url`, `number`, `range`, `date`, `time`, `color`, `search`, `tel`
  - `placeholder`
  - `autofocus`
  - `pattern`
  - `required`
  - `min`, `max`, `step`
  - `formnovalidate`
  - `multiple`
- `contenteditable`.
- `draggable` and drag-and-drop API.
- `data-*` attributes and `dataset`.
- `<template>`.
- `<details>` / `<summary>`.
- `<dialog>` is listed as supported in Chrome 37+, but treat it as unreliable on this target and avoid it.
- HTML Imports v0, later removed. Do not rely on it.
- Custom Elements v0 and Shadow DOM v0 are experimental or unreliable. Do not rely on them.

### Not Available Or Unreliable

- `loading="lazy"`.
- `inputmode`.
- Web Components v1 APIs.

## CSS

### Available

- Flexbox with modern unprefixed syntax.
- Transitions.
- Animations.
- 2D and 3D transforms. Consider `-webkit-` prefixed versions for smart TV WebKit/Chromium forks.
- Media queries, including `min-width`, `orientation`, and `resolution`.
- Gradients:
  - linear
  - radial
  - repeating
- `border-radius`.
- `box-shadow`.
- `text-shadow`.
- multiple backgrounds.
- `background-size`.
- `background-clip`.
- `background-origin`.
- `rgba()`, `hsla()`, and `opacity`.
- `calc()`.
- `@supports`.
- Selectors:
  - `:not()`
  - `:nth-child()`
  - `:nth-of-type()`
  - `:checked`
  - `:target`
  - `:empty`
  - `::before` / `::after`
  - attribute selectors
- `@font-face`.
- `font-feature-settings`.
- WOFF and WOFF2 fonts.
- CSS columns:
  - `column-count`
  - `column-width`
  - `column-gap`
  - `break-inside`
- `pointer-events`.
- `cursor`.
- `box-sizing`.
- `outline`.
- `will-change`.
- `object-fit` / `object-position`.
- Filters such as `blur()` and `grayscale()` only with `-webkit-` prefix. Avoid unprefixed `filter` for Chrome 38.
- CSS regions and shapes are partial or prefixed. Treat as unreliable.

### Not Available

- CSS Grid Layout.
- CSS custom properties / variables: `--var`, `var()`.
- `position: sticky`.
- `display: contents`.
- CSS containment: `contain`.
- Reliable `clip-path` basic shapes.
- Logical properties, such as `margin-inline-start`.
- `gap` for flexbox.
- `aspect-ratio`.
- `:is()`, `:where()`, `:has()`.
- Container queries.
- Subgrid.
- Cascade layers.
- Color level 4 features such as `color-mix` and `oklch`.
- Unprefixed `backdrop-filter`.
- Modern scroll snap syntax.

## Sources Used To Verify

- [Chrome Releases: Chrome 38 stable channel update, October 7, 2014](https://chromereleases.googleblog.com/2014/10/stable-channel-update.html).
- [MDN Browser Compatibility Data](https://github.com/mdn/browser-compat-data) for JavaScript built-ins, Web APIs, HTML elements/attributes, and CSS properties.
- [Can I Use: Media Source Extensions](https://caniuse.com/mediasource) for cross-checking MSE support.
