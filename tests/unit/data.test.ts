import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRuntime } from './runtime.ts';

const episode = (title: string, sortKey: string) => ({ title, sortKey, mediaId: sortKey });
const shows = [
	{
		title: 'Alfa',
		episodes: [episode('Partur 1', '1'), episode('Partur 2', '2'), episode('Partur 1', '3')]
	},
	{ title: 'Beta', episodes: [episode('Partur 1', '1')] }
];

function setup() {
	const BS = loadRuntime(['core/util.js', 'core/data.js']).BS;
	BS.data.buildIndexes(shows);
	return BS.data;
}

test('finds shows by title', () => {
	const data = setup();
	assert.equal(data.getShow('Beta'), shows[1]);
	assert.equal(data.getShow('Gamma'), undefined);
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
