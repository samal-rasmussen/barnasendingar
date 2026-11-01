import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRuntime } from './runtime.ts';

function fakeStorage(initial: Record<string, string> = {}) {
	const items = new Map(Object.entries(initial));
	return {
		items,
		getItem: (key: string) => (items.has(key) ? items.get(key)! : null),
		setItem: (key: string, value: string) => void items.set(key, String(value))
	};
}

function setup(storage: object) {
	return loadRuntime(['core/util.js', 'core/watched.js'], { localStorage: storage }).BS.watched;
}

const alfa = { title: 'Alfa' };
const beta = { title: 'Beta' };
const ep = (sortKey: string) => ({ sortKey });

test('stores watched episodes in the established localStorage format', () => {
	const storage = fakeStorage();
	const watched = setup(storage);

	watched.setWatched(alfa, ep('1'));
	watched.setWatched(alfa, ep('2'));
	watched.setWatched(beta, ep('1'));

	// The format must stay the same, or existing watch history on the TV is lost.
	assert.deepEqual(JSON.parse(storage.items.get('watched')!), {
		Alfa: { '1': true, '2': true },
		Beta: { '1': true }
	});
	assert.equal(watched.isWatched(alfa, ep('2')), true);
	assert.equal(watched.isWatched(alfa, ep('3')), false);
});

test('clearing a show leaves other shows alone', () => {
	const storage = fakeStorage({ watched: '{"Alfa":{"1":true},"Beta":{"1":true}}' });
	const watched = setup(storage);

	watched.clearWatched(alfa);

	assert.equal(watched.isWatched(alfa, ep('1')), false);
	assert.equal(watched.isWatched(beta, ep('1')), true);
});

test('survives broken or unavailable storage', () => {
	const corrupt = setup(fakeStorage({ watched: '{not json' }));
	assert.equal(corrupt.isWatched(alfa, ep('1')), false);

	const failing = setup({
		getItem() {
			throw new Error('denied');
		},
		setItem() {
			throw new Error('denied');
		}
	});
	assert.doesNotThrow(() => failing.setWatched(alfa, ep('1')));
	assert.equal(failing.isWatched(alfa, ep('1')), false);
});
