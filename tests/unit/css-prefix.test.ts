// Checks that every selector in a component's or page's <style> starts from
// one of its owner's classes: a class prefixed with the folder's name
// (`.tile`, `.tile-title`). That keeps each folder's styles inside its own
// elements. After that first part, a selector may name other components'
// classes to style them in that place (`.show-toolbar .tile-title`). See
// "Styles" in docs/component-model.md. core/ holds the global styles and is
// not checked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDir = fileURLToPath(new URL('../../public/', import.meta.url));

/**
 * The first parts of selectors that don't start from an owner's class yet,
 * by folder, with the chunk of docs/component-cleanup-plan.md that removes
 * them. Delete entries as they go. Never add one.
 */
const knownExceptions: Record<string, string[]> = {};

/** Every selector in the <style> elements of an HTML file, one per entry. */
function selectors(html: string): string[] {
	const result: string[] = [];
	for (const style of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
		const css = style[1].replace(/\/\*[\s\S]*?\*\//g, '');
		// The text before each `{` is a selector list or an at-rule.
		for (const prelude of css.matchAll(/([^{}]+)\{/g)) {
			if (!prelude[1].trim().startsWith('@')) {
				result.push(...prelude[1].split(',').map((selector) => selector.trim()));
			}
		}
	}
	return result;
}

/** The selector up to its first combinator, for example `.a:focus` in `.a:focus > b`. */
function firstPart(selector: string): string {
	return selector.split(/\s*[\s>+~]\s*/)[0];
}

function isOwnClass(part: string, name: string): boolean {
	return [...part.matchAll(/\.([a-zA-Z_][\w-]*)/g)].some(
		(match) => match[1] === name || match[1].startsWith(`${name}-`)
	);
}

const folders = ['components', 'pages'].flatMap((kind) =>
	readdirSync(join(publicDir, kind)).map((name) => ({ folder: `${kind}/${name}`, name }))
);

test('component and page selectors start from one of their own classes', () => {
	const problems: string[] = [];

	for (const { folder, name } of folders) {
		const file = join(publicDir, folder, `${name}.html`);
		if (!existsSync(file)) {
			continue;
		}
		const outside = new Set(
			selectors(readFileSync(file, 'utf8'))
				.map(firstPart)
				.filter((part) => !isOwnClass(part, name))
		);
		const known = knownExceptions[folder] ?? [];

		for (const part of outside) {
			if (!known.includes(part)) {
				problems.push(`${folder}: "${part}" does not start from a ".${name}-" class`);
			}
		}
		for (const part of known) {
			if (!outside.has(part)) {
				problems.push(`${folder}: "${part}" is gone, remove it from knownExceptions`);
			}
		}
	}

	assert.deepEqual(problems, []);
});

test('the check reads each selector and its first part', () => {
	const found = selectors(`<style>
	/* .comment {} */
	.a .b-c, .d:focus > span { margin: 0.5rem; background: url(e.png); }
	@media screen and (max-width: 785px) { .f+.g { width: 50%; } }
</style>
<template id="x"><p class="h">.i { }</p></template>`);

	assert.deepEqual(found, ['.a .b-c', '.d:focus > span', '.f+.g']);
	assert.deepEqual(found.map(firstPart), ['.a', '.d:focus', '.f']);
	assert.ok(isOwnClass('.show-toolbar', 'show'));
	assert.ok(isOwnClass('.show', 'show'));
	assert.ok(!isOwnClass('.shows', 'show'));
	assert.ok(!isOwnClass('button', 'show'));
});
