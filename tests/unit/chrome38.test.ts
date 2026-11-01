// Scans the runtime code for features the TV's Chrome 38-era browser lacks
// and that ESLint's ES5 parser can't see: built-in methods, DOM APIs, CSS
// and HTML. See docs/chrome38-features.md. This is a safety net with a
// short list of common mistakes, not a full compatibility check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const runtimeDirs = ['public/core', 'public/components', 'public/pages'];

type Rule = [pattern: RegExp, reason: string];

const jsRules: Rule[] = [
	[
		/\.(includes|startsWith|endsWith|repeat|padStart|padEnd|trimStart|trimEnd)\(/,
		'post-ES5 string/array method'
	],
	[/\.(find|findIndex|findLast|flat|flatMap|fill|copyWithin)\(/, 'post-ES5 array method'],
	[/\b(Object\.(assign|entries|values|fromEntries)|Array\.(from|of))\b/, 'post-ES5 built-in'],
	[/\bfetch\(/, 'fetch is not available, use XMLHttpRequest'],
	[
		/\.(closest|append|prepend|replaceWith|replaceChildren|toggleAttribute)\(/,
		'DOM method newer than Chrome 38'
	],
	[
		/\b(IntersectionObserver|ResizeObserver|requestIdleCallback|AbortController)\b/,
		'API newer than Chrome 38'
	],
	[
		/\b(customElements|attachShadow|createShadowRoot|registerElement)\b/,
		'Web Components are banned'
	],
	[/\?\.|\?\?/, 'optional chaining / nullish coalescing']
];

const cssRules: Rule[] = [
	[/display\s*:\s*(inline-)?grid/, 'CSS Grid'],
	[/var\(--|^\s*--[\w-]+\s*:/m, 'custom properties'],
	[/(^|[\s;{])(row-|column-)?gap\s*:/, 'gap'],
	[/aspect-ratio|place-(items|content|self)|color-scheme/, 'unsupported property'],
	[/position\s*:\s*sticky/, 'position: sticky'],
	[/:(is|where|has)\(/, 'unsupported selector']
];

const htmlRules: Rule[] = [
	[/loading\s*=\s*["']lazy|inputmode\s*=|<dialog\b/, 'unsupported HTML feature'],
	[/<[a-z]+-[a-z-]*[\s>]/, 'custom element (Web Components are banned)']
];

const rulesByExtension: Record<string, Rule[]> = {
	'.js': jsRules,
	'.css': cssRules,
	'.html': htmlRules
};

function filesIn(dir: string): string[] {
	return readdirSync(join(root, dir), { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => relative(root, join(entry.parentPath, entry.name)));
}

/** Blanks out comments so they can mention banned features, keeping line numbers. */
function stripComments(source: string, extension: string): string {
	const blank = (match: string) => match.replace(/[^\n]/g, ' ');
	if (extension === '.html') {
		return source.replace(/<!--[\s\S]*?-->/g, blank);
	}
	const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, blank);
	return extension === '.js' ? withoutBlocks.replace(/^\s*\/\/.*$/gm, blank) : withoutBlocks;
}

const files = [...runtimeDirs.flatMap(filesIn), 'public/index.html'];

test('runtime code only uses features the TV supports', () => {
	const problems: string[] = [];

	for (const file of files) {
		const extension = extname(file);
		const rules = rulesByExtension[extension];
		if (!rules) {
			continue;
		}
		const lines = stripComments(readFileSync(join(root, file), 'utf8'), extension).split('\n');
		lines.forEach((line, index) => {
			for (const [pattern, reason] of rules) {
				if (pattern.test(line)) {
					problems.push(`${file}:${index + 1}: ${reason}: ${line.trim()}`);
				}
			}
		});
	}

	assert.deepEqual(problems, [], 'See docs/chrome38-features.md');
});

test('the scan covers the runtime code', () => {
	assert.ok(files.some((file) => file.endsWith('core/app.js')));
	assert.ok(files.some((file) => file.endsWith('.css')));
	assert.ok(files.some((file) => file.endsWith('.html')));
});
