// Runs the Chrome 38 scan (chrome38-scan.ts) over the runtime code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isScanned, scan } from './chrome38-scan.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const runtimeDirs = ['public/core', 'public/components', 'public/pages'];

function filesIn(dir: string): string[] {
	return readdirSync(join(root, dir), { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => relative(root, join(entry.parentPath, entry.name)));
}

const files = [...runtimeDirs.flatMap(filesIn), 'public/index.html'];

test('runtime code only uses features the TV supports', () => {
	const problems: string[] = [];

	for (const file of files) {
		const extension = extname(file);
		if (!isScanned(extension)) {
			continue;
		}
		const source = readFileSync(join(root, file), 'utf8');
		problems.push(...scan(source, extension).map((problem) => `${file}:${problem}`));
	}

	assert.deepEqual(problems, [], 'See docs/chrome38-features.md');
});

test('the scan covers the runtime code', () => {
	assert.ok(files.some((file) => file.endsWith('core/app.js')));
	assert.ok(files.some((file) => file.endsWith('.css')));
	assert.ok(files.some((file) => file.endsWith('.html')));
});
