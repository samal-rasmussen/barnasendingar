// The Chrome 38 scan: patterns for features the TV's Chrome 38-era browser
// lacks and that ESLint's ES5 parser can't see: built-in methods, DOM APIs,
// CSS and HTML. See docs/chrome38-features.md. It is a safety net of simple
// patterns, not a full compatibility check. chrome38.test.ts runs it over the
// runtime code, and chrome38-checks.test.ts checks that it, ESLint and tsc
// together catch every unsupported feature the doc lists.

export type Extension = '.js' | '.css' | '.html';

type Rule = [pattern: RegExp, reason: string];

const jsRules: Rule[] = [
	[
		/\.(includes|startsWith|endsWith|repeat|padStart|padEnd|trimStart|trimEnd)\(/,
		'post-ES5 string/array method'
	],
	[/\.(find|findIndex|findLast|flat|flatMap|fill|copyWithin)\(/, 'post-ES5 array method'],
	[
		/\b(Object\.(assign|entries|values|fromEntries)|Array\.(from|of)|Proxy|Reflect|BigInt)\b/,
		'post-ES5 built-in'
	],
	[/\bfetch\(/, 'fetch is not available, use XMLHttpRequest'],
	[
		/\.(closest|append|prepend|replaceWith|replaceChildren|toggleAttribute|toBlob|animate)\(/,
		'DOM method newer than Chrome 38'
	],
	[
		/\b(IntersectionObserver|ResizeObserver|requestIdleCallback|AbortController|PointerEvent|PaymentRequest|WebAssembly|WebGL2RenderingContext|PushManager|SyncManager)\b/,
		'API newer than Chrome 38'
	],
	[
		/\bnavigator\.(serviceWorker|share|usb|bluetooth|connection)\b/,
		'navigator API newer than Chrome 38'
	],
	[/\bpointer(down|up|move|over|out|enter|leave|cancel)\b/, 'pointer events'],
	[/['"]webgl2['"]/, 'WebGL 2'],
	[
		/\b(customElements|attachShadow|createShadowRoot|registerElement)\b/,
		'Web Components are banned'
	],
	[/\?\.|\?\?/, 'optional chaining / nullish coalescing']
];

const cssRules: Rule[] = [
	[/display\s*:\s*(inline-)?grid|\bsubgrid\b/, 'CSS Grid'],
	[/display\s*:\s*contents/, 'display: contents'],
	[/var\(--|^\s*--[\w-]+\s*:/m, 'custom properties'],
	[/(^|[\s;{])(row-|column-)?gap\s*:/, 'gap'],
	[/aspect-ratio|place-(items|content|self)|color-scheme/, 'unsupported property'],
	[
		/(^|[\s;{])(contain|clip-path|filter|backdrop-filter)\s*:/,
		'unsupported or unprefixed property'
	],
	[/(^|[\s;{])((margin|padding|border|inset)-(inline|block)\b|inset\s*:)/, 'logical properties'],
	[/scroll-snap-(type|align|stop)/, 'modern scroll snap'],
	[/\b(color-mix|oklch|oklab|lch|lab)\(/, 'CSS Color 4'],
	[/@(container|layer)\b/, 'container queries / cascade layers'],
	[/position\s*:\s*sticky/, 'position: sticky'],
	[/:(is|where|has)\(/, 'unsupported selector']
];

const htmlRules: Rule[] = [
	[/loading\s*=\s*["']lazy|inputmode\s*=|<dialog\b/, 'unsupported HTML feature'],
	[/rel\s*=\s*["']import["']/, 'HTML Imports'],
	[/<[a-z]+-[a-z-]*[\s>]/, 'custom element (Web Components are banned)']
];

const rulesByExtension: Record<Extension, Rule[]> = {
	'.js': jsRules,
	'.css': cssRules,
	'.html': htmlRules
};

export function isScanned(extension: string): extension is Extension {
	return Object.hasOwn(rulesByExtension, extension);
}

/** Blanks out comments so they can mention banned features, keeping line numbers. */
function stripComments(source: string, extension: Extension): string {
	const blank = (match: string) => match.replace(/[^\n]/g, ' ');
	if (extension === '.html') {
		return source.replace(/<!--[\s\S]*?-->/g, blank);
	}
	const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, blank);
	return extension === '.js' ? withoutBlocks.replace(/^\s*\/\/.*$/gm, blank) : withoutBlocks;
}

/** Returns one `line: reason: text` entry per rule that matches a line. */
export function scan(source: string, extension: Extension): string[] {
	const problems: string[] = [];
	const lines = stripComments(source, extension).split('\n');
	lines.forEach((line, index) => {
		for (const [pattern, reason] of rulesByExtension[extension]) {
			if (pattern.test(line)) {
				problems.push(`${index + 1}: ${reason}: ${line.trim()}`);
			}
		}
	});
	return problems;
}
