import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRuntime, plain } from './runtime.ts';

/**
 * A fake of the browser's location, history and hashchange event, enough
 * for the router: setting location.hash adds a history entry (with no
 * state) and fires hashchange, replaceState doesn't, and back() and
 * forward() fire hashchange.
 */
function fakeBrowser(initialHash = '') {
	const entries: Array<{ hash: string; state: unknown }> = [{ hash: initialHash, state: null }];
	let index = 0;
	const listeners: Array<() => void> = [];
	const fire = () => listeners.forEach((listener) => listener());
	const move = (step: number) => {
		if (entries[index + step]) {
			index += step;
			fire();
		}
	};

	const location = {
		get hash() {
			return entries[index].hash;
		},
		set hash(value: string) {
			const hash = value.charAt(0) === '#' ? value : '#' + value;
			if (hash === entries[index].hash) {
				return;
			}
			entries.splice(index + 1, entries.length, { hash, state: null });
			index += 1;
			fire();
		}
	};
	const history = {
		get length() {
			return entries.length;
		},
		get state() {
			return entries[index].state;
		},
		replaceState(state: unknown, _title: string, url?: string) {
			entries[index] = { hash: url ?? entries[index].hash, state };
		},
		back: () => move(-1),
		forward: () => move(1)
	};
	const addEventListener = (type: string, listener: () => void) => {
		if (type === 'hashchange') {
			listeners.push(listener);
		}
	};

	return {
		location,
		history,
		addEventListener,
		entries: () => entries.slice(0, index + 1).map((entry) => entry.hash)
	};
}

/** A router over generic routes. Every render is logged as "name params". */
function setup(initialHash = '') {
	const browser = fakeBrowser(initialHash);
	const window = loadRuntime(['core/router.js'], browser);
	const log: string[] = [];
	const page = (name: string) => (_root: unknown, params: object) => {
		log.push(`${name} ${JSON.stringify(plain(params))}`);
		return () => log.push(`leave ${name}`);
	};

	const router = window.BS.createRouter({
		root: {},
		routes: [
			{ name: 'home', path: '/', render: page('home') },
			{ name: 'item', path: '/items/:id', render: page('item') },
			{ name: 'part', path: '/items/:id/parts/:part', render: page('part') }
		],
		notFound: (_root: unknown, path: string) => {
			log.push(`not found ${path}`);
		}
	});
	return { router, browser, log };
}

test('renders the matching route with decoded params', () => {
	const { router, log } = setup('#/items/S%C3%B8gur%20%2F%201/parts/%231%3F');
	router.start();

	assert.deepEqual(log, ['part {"id":"Søgur / 1","part":"#1?"}']);
	assert.deepEqual(plain(router.current()), {
		name: 'part',
		params: { id: 'Søgur / 1', part: '#1?' }
	});
});

test('an empty address is the root path', () => {
	const { router, log } = setup('');
	router.start();
	assert.deepEqual(log, ['home {}']);
});

test('unmatched and malformed addresses go to notFound', () => {
	for (const hash of ['#/items', '#/items/1/parts', '#/other/1', '#/items/%E0%A4%A']) {
		const { router, log } = setup(hash);
		router.start();
		assert.deepEqual(log, [`not found ${hash.substr(1)}`]);
		assert.equal(router.current().name, null);
	}
});

test('href encodes params, and rejects unknown routes and missing params', () => {
	const { router } = setup();
	assert.equal(router.href('home'), '#/');
	assert.equal(router.href('part', { id: 'a/b', part: 'c d' }), '#/items/a%2Fb/parts/c%20d');
	assert.throws(() => router.href('nope'), /Unknown route: nope/);
	assert.throws(() => router.href('item'), /needs param id/);
});

test('go adds a history entry and cleans up the page it leaves', () => {
	const { router, browser, log } = setup('#/');
	router.start();

	router.go('item', { id: '1' });

	assert.deepEqual(browser.entries(), ['#/', '#/items/1']);
	assert.deepEqual(log, ['home {}', 'leave home', 'item {"id":"1"}']);
});

test('go with replace swaps the current entry', () => {
	const { router, browser, log } = setup('#/items/1');
	router.start();

	router.go('item', { id: '2' }, { replace: true });

	assert.deepEqual(browser.entries(), ['#/items/2']);
	assert.deepEqual(log.at(-1), 'item {"id":"2"}');
});

test('go with replace and render false only changes the address', () => {
	const { router, browser, log } = setup('#/items/1');
	router.start();

	router.go('item', { id: '2' }, { replace: true, render: false });

	assert.deepEqual(browser.entries(), ['#/items/2']);
	assert.deepEqual(log, ['item {"id":"1"}']);
	assert.deepEqual(plain(router.current()), { name: 'item', params: { id: '2' } });
});

test('back uses history when the target is the previous page', () => {
	const { router, browser, log } = setup('#/');
	router.start();
	router.go('item', { id: '1' });
	router.go('part', { id: '1', part: 'a' });

	router.back('item', { id: '1' });
	router.back('home');

	assert.deepEqual(browser.entries(), ['#/']);
	assert.equal(log.at(-1), 'home {}');
});

test('back replaces the page when the target is not the previous page', () => {
	// Opened directly, so there is no app page to go back to.
	const { router, browser } = setup('#/items/1/parts/a');
	router.start();

	router.back('item', { id: '1' });
	router.back('home');

	assert.deepEqual(browser.entries(), ['#/']);
	assert.equal(browser.history.length, 1);
});

test('refresh, replace and address-only changes keep the previous page for back', () => {
	const { router, browser } = setup('#/items/1');
	router.start();
	router.go('part', { id: '1', part: 'a' });

	router.refresh();
	router.go('part', { id: '1', part: 'b' }, { replace: true });
	router.go('part', { id: '1', part: 'c' }, { replace: true, render: false });
	router.back('item', { id: '1' });

	assert.deepEqual(browser.entries(), ['#/items/1']);
});

test('back keeps working after moving with the browser back and forward buttons', () => {
	const { router, browser, log } = setup('#/');
	router.start();
	router.go('item', { id: '1' });
	router.go('part', { id: '1', part: 'a' });

	browser.history.back();
	browser.history.forward();
	router.back('item', { id: '1' });
	router.back('home');

	assert.deepEqual(browser.entries(), ['#/']);
	assert.equal(log.at(-1), 'home {}');
});
