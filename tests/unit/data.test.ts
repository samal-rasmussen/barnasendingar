import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRuntime, plain } from './runtime.ts';

const episode = (title: string, sortKey: string) => ({ title, sortKey, mediaId: sortKey });
const shows = [
	{
		title: 'Alfa',
		episodes: [episode('Partur 1', '1'), episode('Partur 2', '2'), episode('Partur 1', '3')]
	},
	{ title: 'Beta', episodes: [episode('Partur 1', '1')] }
];

/** Loads data.js and its catalogue, with getJson answering from `shows`. */
function setup() {
	const BS = loadRuntime(['core/http.js', 'core/data.js']).BS;
	BS.http.getJson = (url: string, callback: (error: Error | null, result?: unknown) => void) =>
		callback(null, url === '/assets/shows.json' ? shows : undefined);
	BS.data.load(() => {});
	return BS.data;
}

test('has no shows until the catalogue loads, then all of them in order', () => {
	const BS = loadRuntime(['core/http.js', 'core/data.js']).BS;
	assert.deepEqual(plain(BS.data.getShows()), []);
	assert.equal(BS.data.getShow('Alfa'), undefined);

	assert.equal(setup().getShows(), shows);
});

test('passes on a failed load', () => {
	const BS = loadRuntime(['core/http.js', 'core/data.js']).BS;
	const failure = new Error('failed');
	const results: (Error | null)[] = [];
	BS.http.getJson = (_url: string, callback: (error: Error) => void) => callback(failure);

	BS.data.load((error: Error | null) => results.push(error));

	assert.deepEqual(results, [failure]);
});

test('finds shows by title', () => {
	const data = setup();
	assert.equal(data.getShow('Beta'), shows[1]);
	assert.equal(data.getShow('Gamma'), undefined);
	assert.equal(data.getShow('constructor'), undefined);
});

test('finds episodes by title, preferring the first of duplicate titles', () => {
	const data = setup();
	assert.equal(data.getEpisode(shows[0], 'Partur 2'), shows[0].episodes[1]);
	assert.equal(data.getEpisode(shows[0], 'Partur 1'), shows[0].episodes[0]);
	assert.equal(data.getEpisode(shows[0], 'Partur 9'), undefined);
});

test('finds the next episode by identity or sortKey', () => {
	const data = setup();
	assert.equal(data.getNextEpisode(shows[0], shows[0].episodes[0]), shows[0].episodes[1]);
	assert.equal(data.getNextEpisode(shows[0], { sortKey: '2' }), shows[0].episodes[2]);
	assert.equal(data.getNextEpisode(shows[0], shows[0].episodes[2]), undefined);
	assert.equal(data.getNextEpisode(shows[0], { sortKey: 'x' }), undefined);
});

test('builds the playlist address from a mediaId', () => {
	const data = setup();
	assert.equal(
		data.playlistUrl('abc-1'),
		'https://vod.kringvarp.fo/redirect/video/_definst_/smil:smil/video/abc-1.smil?type=m3u8'
	);
});
