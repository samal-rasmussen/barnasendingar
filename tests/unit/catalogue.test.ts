// Sanity checks for the scraped catalogue. Run after `node --run scrape`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Show } from '../../scripts/shared-types.d.ts';

const shows: Show[] = JSON.parse(
	readFileSync(new URL('../../public/assets/shows.json', import.meta.url), 'utf8')
);

test('the catalogue has shows', () => {
	assert.ok(Array.isArray(shows) && shows.length > 0);
});

test('every show has a unique title, an image and episodes', () => {
	const titles = new Set<string>();
	for (const show of shows) {
		assert.ok(show.title, 'show without a title');
		assert.ok(!titles.has(show.title), `duplicate show title: ${show.title}`);
		titles.add(show.title);
		assert.ok(show.img, `${show.title}: no image`);
		assert.ok(show.episodes.length > 0, `${show.title}: no episodes`);
	}
});

test('every episode has a title, an image and a sortKey unique within its show', () => {
	for (const show of shows) {
		const sortKeys = new Set<string>();
		for (const episode of show.episodes) {
			const name = `${show.title} / ${episode.title}`;
			assert.ok(episode.title, `${show.title}: episode without a title`);
			assert.ok(episode.img, `${name}: no image`);
			assert.ok(episode.sortKey, `${name}: no sortKey`);
			assert.ok(!sortKeys.has(episode.sortKey), `${name}: duplicate sortKey ${episode.sortKey}`);
			sortKeys.add(episode.sortKey);
		}
	}
});

test('lists episodes without video', (t) => {
	// Allowed (the episode page shows a message), but worth knowing about.
	for (const show of shows) {
		for (const episode of show.episodes) {
			if (!episode.mediaId) {
				t.diagnostic(`no mediaId: ${show.title} / ${episode.title}`);
			}
		}
	}
});
