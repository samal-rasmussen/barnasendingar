import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const publicDir = new URL('../../public/', import.meta.url);

/**
 * Runs runtime scripts from public/ in a fresh sandbox, the way the browser
 * would load them with <script> tags, and returns the sandbox's `window`.
 * While each file runs, `document.currentScript.src` is its URL, as BS.load
 * expects. `globals` become globals inside the sandbox, for example a fake
 * `localStorage` or `location`.
 */
export function loadRuntime(files: string[], globals: Record<string, unknown> = {}): any {
	const context = vm.createContext({
		document: {},
		console: { error() {} },
		...globals
	}) as any;
	context.window = context;

	for (const file of ['core/app.js', ...files]) {
		const code = readFileSync(new URL(file, publicDir), 'utf8');
		context.document.currentScript = { src: `http://localhost/${file}` };
		vm.runInContext(code, context, { filename: file });
	}
	context.document.currentScript = null;
	return context;
}

/** Copies a value out of the sandbox, so node:assert can compare it. */
export function plain<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}
