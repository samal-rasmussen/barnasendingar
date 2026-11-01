import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRuntime, plain } from './runtime.ts';

function setup() {
	const window = loadRuntime(['core/util.js', 'core/router.js'], { location: { hash: '' } });
	return {
		router: window.BS.router,
		parse(hash: string) {
			window.location.hash = hash;
			return plain(window.BS.router.parse());
		}
	};
}

test('parses the front page', () => {
	const { parse } = setup();
	assert.deepEqual(parse(''), { name: 'home' });
	assert.deepEqual(parse('#/'), { name: 'home' });
});

test('parses show and episode routes', () => {
	const { parse } = setup();
	assert.deepEqual(parse('#/sending/Alfa'), { name: 'show', showTitle: 'Alfa' });
	assert.deepEqual(parse('#/sending/Alfa/partur/Partur%201'), {
		name: 'episode',
		showTitle: 'Alfa',
		episodeTitle: 'Partur 1'
	});
});

test('anything else is not found', () => {
	const { parse } = setup();
	for (const hash of ['#/sending', '#/sending/Alfa/partur', '#/onnur/Alfa', '#/sending/%E0%A4%A']) {
		assert.deepEqual(parse(hash), { name: 'not-found' }, hash);
	}
});

test('built hashes parse back to the same titles', () => {
	const { router, parse } = setup();
	const show = 'Søgur / Ævintýr á Øy';
	const episode = 'Hvat er #1? & meira';

	assert.deepEqual(parse(router.showHash(show)), { name: 'show', showTitle: show });
	assert.deepEqual(parse(router.episodeHash(show, episode)), {
		name: 'episode',
		showTitle: show,
		episodeTitle: episode
	});
	assert.equal(router.homeHash(), '#/');
});

test('compares routes by page and titles', () => {
	const { router } = setup();
	const route = (hash: string) => router.parseHash(hash);

	assert.equal(router.sameRoute(route('#/sending/Alfa'), route('#/sending/Alfa')), true);
	assert.equal(router.sameRoute(route('#/sending/Alfa'), route('#/sending/Beta')), false);
	assert.equal(router.sameRoute(route('#/'), route('')), true);
	assert.equal(router.sameRoute(route('#/'), null), false);
});
