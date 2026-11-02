import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRuntime } from './runtime.ts';

type Callback = (error: Error | null, text?: string) => void;

/**
 * Loads core plus a component and a page script, with getText replaced by
 * a recorder and a fake document that records the HTML it is asked to
 * parse, so no DOM or network is needed.
 */
function setup() {
	const added: string[] = [];
	const document = {
		createElement: () => ({
			set innerHTML(html: string) {
				added.push(html);
			},
			children: []
		})
	};
	const BS = loadRuntime(
		['core/http.js', 'core/templates.js', 'components/tile/tile.js', 'pages/home/home.js'],
		{ document }
	).BS;
	const requests: { url: string; callback: Callback }[] = [];
	BS.http.getText = (url: string, callback: Callback) => requests.push({ url, callback });
	return { BS, requests, added };
}

test('BS.load resolves file names relative to the calling script', () => {
	const { BS, requests } = setup();

	BS.templates.load(() => {});

	assert.deepEqual(
		requests.map((request) => request.url),
		['http://localhost/components/tile/tile.html', 'http://localhost/pages/home/home.html']
	);
});

test('files are added in registration order, whatever order they load in', () => {
	const { BS, requests, added } = setup();
	const results: (Error | null)[] = [];

	BS.templates.load((error: Error | null) => results.push(error));
	requests[1].callback(null, 'home');
	assert.deepEqual(added, []);
	requests[0].callback(null, 'tile');

	assert.deepEqual(added, ['tile', 'home']);
	assert.deepEqual(results, [null]);
});

test('a retry only fetches the files that failed, then adds everything once', () => {
	const { BS, requests, added } = setup();
	const results: (Error | null)[] = [];
	const done = (error: Error | null) => results.push(error);

	BS.templates.load(done);
	requests[1].callback(null, 'home');
	requests[0].callback(new Error('failed'));
	BS.templates.load(done);
	requests[2].callback(null, 'tile');

	assert.deepEqual(
		requests.map((request) => request.url.replace('http://localhost/', '')),
		['components/tile/tile.html', 'pages/home/home.html', 'components/tile/tile.html']
	);
	assert.deepEqual(added, ['tile', 'home']);
	assert.equal(results.length, 2);
	assert.ok(results[0] instanceof Error);
	assert.equal(results[1], null);
});

test('BS.load throws when called after the script has run', () => {
	const { BS } = setup();

	assert.throws(() => BS.load('late.html'), /BS\.load must be called/);
});
