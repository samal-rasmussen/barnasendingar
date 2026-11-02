// Checks that public/index.html loads every runtime script and stylesheet,
// that nothing it loads is missing, and that it loads them in the order the
// app relies on: vendor, then core, then components, then pages. There are
// no modules on the TV, so a file left out of index.html simply never runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const publicDir = join(root, 'public');
const runtimeDirs = ['core', 'components', 'pages'];
const groupOrder = ['vendor', ...runtimeDirs];

const html = readFileSync(join(publicDir, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');

/** Paths are relative to public/, without a leading slash, as in index.html. */
function attributeValues(tagPattern: RegExp, attribute: string): string[] {
	const valuePattern = new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`);
	return (html.match(tagPattern) ?? []).flatMap((tag) => {
		const match = valuePattern.exec(tag);
		return match ? [match[1].replace(/^\//, '')] : [];
	});
}

const scripts = attributeValues(/<script\b[^>]*>/g, 'src');
const stylesheets = attributeValues(/<link\b[^>]*\brel\s*=\s*["']stylesheet["'][^>]*>/g, 'href');

function runtimeFiles(extension: string): string[] {
	return runtimeDirs.flatMap((dir) =>
		readdirSync(join(publicDir, dir), { recursive: true, withFileTypes: true })
			.filter((entry) => entry.isFile() && extname(entry.name) === extension)
			.map((entry) => relative(publicDir, join(entry.parentPath, entry.name)))
	);
}

function assertLoadsAll(loaded: string[], extension: string, tag: string) {
	const missing = runtimeFiles(extension).filter((file) => !loaded.includes(file));
	assert.deepEqual(missing, [], `Add a ${tag} for these files to public/index.html`);
}

function assertAllExist(loaded: string[]) {
	const missing = loaded.filter((file) => !existsSync(join(publicDir, file)));
	assert.deepEqual(missing, [], 'public/index.html loads files that do not exist');
}

function assertGroupOrder(loaded: string[]) {
	let previous = 0;
	for (const file of loaded) {
		const group = groupOrder.indexOf(file.split('/')[0]);
		assert.ok(group !== -1, `${file} is not under ${groupOrder.join('/, ')}/`);
		assert.ok(
			group >= previous,
			`${file} loads after ${groupOrder[previous]}/, but must load before it. ` +
				`The order is ${groupOrder.join(', ')}.`
		);
		previous = group;
	}
}

test('index.html finds scripts and stylesheets to check', () => {
	assert.ok(scripts.includes('core/app.js'));
	assert.ok(stylesheets.includes('core/base.css'));
});

test('index.html has a <script> for every runtime .js file', () => {
	assertLoadsAll(scripts, '.js', '<script>');
});

test('index.html has a <link> for every runtime .css file', () => {
	assertLoadsAll(stylesheets, '.css', '<link rel="stylesheet">');
});

test('every script and stylesheet in index.html exists', () => {
	assertAllExist([...scripts, ...stylesheets]);
});

test('index.html loads scripts in the order vendor, core, components, pages', () => {
	assertGroupOrder(scripts);
});

test('index.html loads stylesheets in the order vendor, core, components, pages', () => {
	assertGroupOrder(stylesheets);
});
