// Checks that the checks work: every feature docs/chrome38-features.md lists
// as not available on the TV must fail at least one of ESLint (with the
// project's config for runtime code), tsc (with the project's tsconfig.json)
// and the Chrome 38 scan. Each probe names the tools expected to catch it, so
// a config change that silently stops a tool from catching something fails
// here. Probes are kept clean apart from the feature itself, and only the
// signal each tool is responsible for counts: ESLint parse errors, tsc errors
// about a missing library, and scan matches.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { scan, type Extension } from './chrome38-scan.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));

type Tool = 'eslint' | 'tsc' | 'scan';

type Probe = {
	feature: string;
	extension: Extension;
	code: string;
	caughtBy: Tool[];
};

/** Valid code for the TV, shaped like the probes. No tool may flag it. */
const controls: Probe[] = [
	{
		feature: 'ES5',
		extension: '.js',
		code: "var list = [1, 2].map(function (n) { return n * 2; });\nconsole.log(list.indexOf(2), 'ab'.indexOf('a'), Object.keys({}), new Map(), Promise.resolve(1));",
		caughtBy: []
	},
	{
		feature: 'CSS',
		extension: '.css',
		code: '.a { display: flex; -webkit-filter: blur(2px); margin-left: 1em; }',
		caughtBy: []
	},
	{
		feature: 'HTML',
		extension: '.html',
		code: '<style>\n\t.a { display: flex; }\n</style>\n<template id="a"><main><img src="a.png" alt=""><input type="number"><p>display: grid;</p><svg><use xlink:href="#a"></use></svg></main></template>',
		caughtBy: []
	}
];

/** One probe per item under "Not Available" in docs/chrome38-features.md. */
const probes: Probe[] = [
	// JavaScript syntax
	{ feature: 'let', extension: '.js', code: 'let a = 1;\nconsole.log(a);', caughtBy: ['eslint'] },
	{
		feature: 'const',
		extension: '.js',
		code: 'const a = 1;\nconsole.log(a);',
		caughtBy: ['eslint']
	},
	{
		feature: 'arrow function',
		extension: '.js',
		code: 'console.log([1].map((n) => n));',
		caughtBy: ['eslint']
	},
	{ feature: 'class', extension: '.js', code: 'class A {}\nconsole.log(A);', caughtBy: ['eslint'] },
	{
		feature: 'template literal',
		extension: '.js',
		code: 'console.log(`a`);',
		caughtBy: ['eslint']
	},
	{
		feature: 'default parameter',
		extension: '.js',
		code: 'function f(a = 1) { return a; }\nconsole.log(f);',
		caughtBy: ['eslint']
	},
	{
		feature: 'rest parameter',
		extension: '.js',
		code: 'function f(...a) { return a; }\nconsole.log(f);',
		caughtBy: ['eslint']
	},
	{
		feature: 'spread',
		extension: '.js',
		code: 'console.log(Math.max(...[1]));',
		caughtBy: ['eslint']
	},
	{
		feature: 'destructuring',
		extension: '.js',
		code: 'var { a } = { a: 1 };\nconsole.log(a);',
		caughtBy: ['eslint']
	},
	{
		feature: 'generator',
		extension: '.js',
		code: 'function* f() { yield 1; }\nconsole.log(f);',
		caughtBy: ['eslint']
	},
	{ feature: 'octal literal', extension: '.js', code: 'console.log(0o7);', caughtBy: ['eslint'] },
	{ feature: 'binary literal', extension: '.js', code: 'console.log(0b1);', caughtBy: ['eslint'] },
	{
		feature: 'import',
		extension: '.js',
		code: "import a from 'a';\nconsole.log(a);",
		caughtBy: ['eslint']
	},
	{ feature: 'export', extension: '.js', code: 'export var a = 1;', caughtBy: ['eslint'] },
	{
		feature: 'async/await',
		extension: '.js',
		code: 'async function f() { await f(); }\nconsole.log(f);',
		caughtBy: ['eslint']
	},
	{ feature: 'BigInt literal', extension: '.js', code: 'console.log(1n);', caughtBy: ['eslint'] },
	{
		feature: 'optional chaining',
		extension: '.js',
		code: 'var a = {};\nconsole.log(a?.b);',
		caughtBy: ['eslint', 'scan']
	},
	{
		feature: 'nullish coalescing',
		extension: '.js',
		code: 'var a = null;\nconsole.log(a ?? 1);',
		caughtBy: ['eslint', 'scan']
	},
	{
		feature: 'logical assignment',
		extension: '.js',
		code: 'var a = 0;\na ||= 1;\nconsole.log(a);',
		caughtBy: ['eslint']
	},

	// JavaScript built-ins
	...['startsWith', 'endsWith', 'includes'].map(
		(method): Probe => ({
			feature: `String.prototype.${method}`,
			extension: '.js',
			code: `console.log('ab'.${method}('a'));`,
			caughtBy: ['scan']
		})
	),
	{
		feature: 'String.prototype.repeat',
		extension: '.js',
		code: "console.log('a'.repeat(2));",
		caughtBy: ['scan']
	},
	{
		feature: 'Proxy',
		extension: '.js',
		code: 'console.log(new Proxy({}, {}));',
		caughtBy: ['scan']
	},
	{
		feature: 'Object.assign',
		extension: '.js',
		code: 'console.log(Object.assign({}, {}));',
		caughtBy: ['scan']
	},
	{
		feature: 'Array.from',
		extension: '.js',
		code: 'console.log(Array.from([1]));',
		caughtBy: ['scan']
	},
	{ feature: 'Array.of', extension: '.js', code: 'console.log(Array.of(1));', caughtBy: ['scan'] },
	...['find', 'findIndex'].map(
		(method): Probe => ({
			feature: `Array.prototype.${method}`,
			extension: '.js',
			code: `console.log([1].${method}(function (n) { return n > 0; }));`,
			caughtBy: ['scan']
		})
	),
	{
		feature: 'Array.prototype.includes',
		extension: '.js',
		code: 'console.log([1].includes(1));',
		caughtBy: ['tsc', 'scan']
	},
	{
		feature: 'BigInt',
		extension: '.js',
		code: 'console.log(BigInt(1));',
		caughtBy: ['tsc', 'scan']
	},

	// Web APIs
	{
		feature: 'HTMLCanvasElement.toBlob',
		extension: '.js',
		code: "document.createElement('canvas').toBlob(function (blob) { console.log(blob); });",
		caughtBy: ['scan']
	},
	{ feature: 'fetch', extension: '.js', code: "console.log(fetch('/'));", caughtBy: ['scan'] },
	{
		feature: 'Service Workers',
		extension: '.js',
		code: "navigator.serviceWorker.register('/sw.js');",
		caughtBy: ['scan']
	},
	{
		feature: 'Web Animations',
		extension: '.js',
		code: 'document.body.animate([], 100);',
		caughtBy: ['scan']
	},
	...['IntersectionObserver', 'ResizeObserver'].map(
		(api): Probe => ({
			feature: api,
			extension: '.js',
			code: `console.log(new ${api}(function () {}));`,
			caughtBy: ['scan']
		})
	),
	{
		feature: 'Pointer Events',
		extension: '.js',
		code: "document.addEventListener('pointerdown', function (event) { console.log(event); });",
		caughtBy: ['scan']
	},
	{ feature: 'Push API', extension: '.js', code: 'console.log(PushManager);', caughtBy: ['scan'] },
	{
		feature: 'Background Sync',
		extension: '.js',
		code: 'console.log(SyncManager);',
		caughtBy: ['scan']
	},
	{
		feature: 'Payment Request',
		extension: '.js',
		code: 'console.log(new PaymentRequest([], { total: { label: "a", amount: { currency: "DKK", value: "1" } } }));',
		caughtBy: ['scan']
	},
	{ feature: 'Web Share', extension: '.js', code: 'navigator.share({});', caughtBy: ['scan'] },
	{ feature: 'WebUSB', extension: '.js', code: 'console.log(navigator.usb);', caughtBy: ['scan'] },
	{
		feature: 'WebBluetooth',
		extension: '.js',
		code: 'console.log(navigator.bluetooth);',
		caughtBy: ['scan']
	},
	{
		feature: 'Network Information API',
		extension: '.js',
		code: 'console.log(navigator.connection);',
		caughtBy: ['scan']
	},
	{
		feature: 'WebGL 2',
		extension: '.js',
		code: "console.log(document.createElement('canvas').getContext('webgl2'));",
		caughtBy: ['scan']
	},
	{
		feature: 'WebAssembly',
		extension: '.js',
		code: 'console.log(WebAssembly);',
		caughtBy: ['scan']
	},
	{
		feature: 'Custom Elements',
		extension: '.js',
		code: "customElements.define('a-b', HTMLElement);",
		caughtBy: ['scan']
	},
	{
		feature: 'Shadow DOM',
		extension: '.js',
		code: "document.body.attachShadow({ mode: 'open' });",
		caughtBy: ['scan']
	},

	// HTML
	{
		feature: 'loading="lazy"',
		extension: '.html',
		code: '<img src="a.png" alt="" loading="lazy">',
		caughtBy: ['scan']
	},
	{
		feature: 'inputmode',
		extension: '.html',
		code: '<input inputmode="numeric">',
		caughtBy: ['scan']
	},
	{ feature: '<dialog>', extension: '.html', code: '<dialog open>a</dialog>', caughtBy: ['scan'] },
	{ feature: 'custom element', extension: '.html', code: '<a-b>a</a-b>', caughtBy: ['scan'] },
	{
		feature: 'HTML Imports',
		extension: '.html',
		code: '<link rel="import" href="a.html">',
		caughtBy: ['scan']
	},
	{
		feature: 'plain href on <use>',
		extension: '.html',
		code: '<svg><use href="#icon-back"></use></svg>',
		caughtBy: ['scan']
	},

	// CSS
	{ feature: 'Grid', extension: '.css', code: '.a { display: grid; }', caughtBy: ['scan'] },
	{
		feature: 'Grid in a <style> in HTML',
		extension: '.html',
		code: '<style>\n\t.a { display: grid; }\n</style>',
		caughtBy: ['scan']
	},
	{
		feature: 'inline Grid',
		extension: '.css',
		code: '.a { display: inline-grid; }',
		caughtBy: ['scan']
	},
	{
		feature: 'subgrid',
		extension: '.css',
		code: '.a { grid-template-columns: subgrid; }',
		caughtBy: ['scan']
	},
	{
		feature: 'custom property',
		extension: '.css',
		code: '.a {\n\t--size: 1em;\n}',
		caughtBy: ['scan']
	},
	{ feature: 'var()', extension: '.css', code: '.a { width: var(--size); }', caughtBy: ['scan'] },
	{
		feature: 'position: sticky',
		extension: '.css',
		code: '.a { position: sticky; }',
		caughtBy: ['scan']
	},
	{
		feature: 'display: contents',
		extension: '.css',
		code: '.a { display: contents; }',
		caughtBy: ['scan']
	},
	{ feature: 'contain', extension: '.css', code: '.a { contain: layout; }', caughtBy: ['scan'] },
	{
		feature: 'clip-path',
		extension: '.css',
		code: '.a { clip-path: circle(50%); }',
		caughtBy: ['scan']
	},
	{
		feature: 'logical property',
		extension: '.css',
		code: '.a { margin-inline-start: 1em; }',
		caughtBy: ['scan']
	},
	{ feature: 'inset', extension: '.css', code: '.a { inset: 0; }', caughtBy: ['scan'] },
	{
		feature: 'flex gap',
		extension: '.css',
		code: '.a { display: flex; gap: 1em; }',
		caughtBy: ['scan']
	},
	{ feature: 'row-gap', extension: '.css', code: '.a { row-gap: 1em; }', caughtBy: ['scan'] },
	{
		feature: 'aspect-ratio',
		extension: '.css',
		code: '.a { aspect-ratio: 16 / 9; }',
		caughtBy: ['scan']
	},
	{
		feature: 'place-items',
		extension: '.css',
		code: '.a { place-items: center; }',
		caughtBy: ['scan']
	},
	{
		feature: 'color-scheme',
		extension: '.css',
		code: ':root { color-scheme: dark; }',
		caughtBy: ['scan']
	},
	...['is', 'where', 'has'].map(
		(selector): Probe => ({
			feature: `:${selector}()`,
			extension: '.css',
			code: `.a:${selector}(.b) { color: red; }`,
			caughtBy: ['scan']
		})
	),
	{
		feature: 'container query',
		extension: '.css',
		code: '@container (min-width: 1px) { .a { color: red; } }',
		caughtBy: ['scan']
	},
	{
		feature: 'cascade layer',
		extension: '.css',
		code: '@layer base { .a { color: red; } }',
		caughtBy: ['scan']
	},
	{
		feature: 'color-mix',
		extension: '.css',
		code: '.a { color: color-mix(in srgb, red, blue); }',
		caughtBy: ['scan']
	},
	{
		feature: 'oklch',
		extension: '.css',
		code: '.a { color: oklch(50% 0.1 120); }',
		caughtBy: ['scan']
	},
	{
		feature: 'unprefixed backdrop-filter',
		extension: '.css',
		code: '.a { backdrop-filter: blur(2px); }',
		caughtBy: ['scan']
	},
	{
		feature: 'unprefixed filter',
		extension: '.css',
		code: '.a { filter: blur(2px); }',
		caughtBy: ['scan']
	},
	{
		feature: 'modern scroll snap',
		extension: '.css',
		code: '.a { scroll-snap-type: x mandatory; }',
		caughtBy: ['scan']
	}
];

const all = [...controls, ...probes];
const caught = new Map<Probe, Set<Tool>>(all.map((probe) => [probe, new Set<Tool>()]));
let tempDir = '';

/** Lints each JS probe as if it were a runtime file, with the project's config. */
async function runEslint(): Promise<void> {
	const eslint = new ESLint({ cwd: root });
	for (const probe of all) {
		if (probe.extension !== '.js') {
			continue;
		}
		const [result] = await eslint.lintText(probe.code, {
			filePath: join(root, 'public/core/probe.js')
		});
		if (result.messages.some((message) => message.fatal)) {
			caught.get(probe)!.add('eslint');
		}
	}
}

// Library errors: "Do you need to change your target library?"
const tscLibraryErrors = new Set([2550, 2583, 2585]);

/**
 * Type-checks every JS probe in one tsc run, with a tsconfig that extends the
 * project's and only swaps the files. Each probe is wrapped in a function so
 * that probes don't share globals.
 */
function runTsc(): void {
	const jsProbes = all.filter((probe) => probe.extension === '.js');
	const files = jsProbes.map((_, index) => `probe-${index}.js`);
	jsProbes.forEach((probe, index) => {
		writeFileSync(join(tempDir, files[index]), `(function () {\n${probe.code}\n})();\n`);
	});
	writeFileSync(
		join(tempDir, 'tsconfig.json'),
		JSON.stringify({ extends: join(root, 'tsconfig.json'), files, include: [] })
	);

	let output: string;
	try {
		output = execFileSync(
			process.execPath,
			[join(root, 'node_modules/typescript/bin/tsc'), '-p', tempDir, '--pretty', 'false'],
			{ cwd: tempDir, encoding: 'utf8' }
		);
	} catch (error) {
		output = (error as { stdout: string }).stdout;
	}

	for (const line of output.split('\n')) {
		if (!line.trim()) {
			continue;
		}
		const match = /(?:^|\/)probe-(\d+)\.js\(\d+,\d+\): error TS(\d+):/.exec(line);
		if (!match) {
			// Continuation lines of a probe error are indented. Anything else
			// means tsc itself failed, for example on a broken config.
			assert.match(line, /^\s/, `Unexpected tsc output: ${line}`);
			continue;
		}
		if (tscLibraryErrors.has(Number(match[2]))) {
			caught.get(jsProbes[Number(match[1])])!.add('tsc');
		}
	}
}

before(async () => {
	tempDir = realpathSync(mkdtempSync(join(tmpdir(), 'chrome38-checks-')));
	for (const probe of all) {
		if (scan(probe.code, probe.extension).length > 0) {
			caught.get(probe)!.add('scan');
		}
	}
	await runEslint();
	runTsc();
});

after(() => {
	rmSync(tempDir, { recursive: true, force: true });
});

test('valid code passes every check', () => {
	for (const control of controls) {
		assert.deepEqual([...caught.get(control)!], [], `${control.feature} control was flagged`);
	}
});

test('every feature the TV lacks fails the expected checks', () => {
	const missed: string[] = [];
	for (const probe of probes) {
		const tools = caught.get(probe)!;
		const notCaughtBy = probe.caughtBy.filter((tool) => !tools.has(tool));
		if (notCaughtBy.length > 0 || probe.caughtBy.length === 0) {
			missed.push(
				`${probe.feature}: expected ${probe.caughtBy.join(', ')}, caught by ${[...tools].join(', ') || 'nothing'}`
			);
		}
	}
	assert.deepEqual(missed, []);
});
