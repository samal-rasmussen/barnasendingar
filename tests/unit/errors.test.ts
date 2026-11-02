import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRuntime } from './runtime.ts';

/**
 * Loads core/app.js and errors.js on the given host, with a fake
 * XMLHttpRequest that records what would be sent to PostHog.
 */
function setup(hostname: string) {
	const sent: { url: string; body: any }[] = [];
	const storage = new Map<string, string>();
	class FakeXhr {
		url = '';
		open(_method: string, url: string) {
			this.url = url;
		}
		setRequestHeader() {}
		send(body: string) {
			sent.push({ url: this.url, body: JSON.parse(body) });
		}
	}
	const window = loadRuntime(['errors/errors.js'], {
		location: { hostname, search: '', href: `https://${hostname}/#/` },
		navigator: { userAgent: 'TestTV/1.0' },
		screen: { width: 1920, height: 1080 },
		localStorage: {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => void storage.set(key, value)
		},
		XMLHttpRequest: FakeXhr
	});
	return { window, BS: window.BS, sent };
}

test('sends errors to PostHog on the Vercel deployments', () => {
	const { BS, sent } = setup('barnasendingar.vercel.app');
	const error = new Error('nope');
	error.stack =
		'Error: nope\n    at load (https://x/core/http.js:10:5)\n    at https://x/core/app.js:3:1';

	BS.logError('Could not load.', error);

	assert.equal(sent.length, 1);
	assert.equal(sent[0].url, 'https://eu.i.posthog.com/i/v0/e/');
	const { token, event, properties } = sent[0].body;
	assert.match(token, /^phc_/);
	assert.equal(event, '$exception');
	assert.match(properties.distinct_id, /^tv-/);
	assert.equal(properties.$raw_user_agent, 'TestTV/1.0');
	assert.deepEqual(properties.$exception_list, [
		{
			type: 'Error',
			value: 'Could not load. Error: nope',
			mechanism: { handled: true, synthetic: false },
			stacktrace: {
				type: 'raw',
				frames: [
					{
						platform: 'custom',
						lang: 'javascript',
						function: '?',
						filename: 'https://x/core/app.js',
						lineno: 3,
						colno: 1,
						in_app: true
					},
					{
						platform: 'custom',
						lang: 'javascript',
						function: 'load',
						filename: 'https://x/core/http.js',
						lineno: 10,
						colno: 5,
						in_app: true
					}
				]
			}
		}
	]);
});

test('reports uncaught errors as unhandled, with the same id', () => {
	const { window, BS, sent } = setup('barnasendingar-git-x.vercel.app');

	BS.logError('First.', null);
	window.onerror('Uncaught TypeError: x is undefined', 'https://x/a.js', 4, 2, undefined);

	assert.equal(sent.length, 2);
	assert.equal(
		sent[1].body.properties.$exception_list[0].value,
		'Uncaught at https://x/a.js:4:2: Uncaught TypeError: x is undefined'
	);
	assert.equal(sent[1].body.properties.$exception_list[0].mechanism.handled, false);
	assert.equal(sent[1].body.properties.distinct_id, sent[0].body.properties.distinct_id);
});

test('sends each message once, and at most ten per page load', () => {
	const { BS, sent } = setup('barnasendingar.vercel.app');

	BS.logError('Same.', null);
	BS.logError('Same.', null);
	for (let i = 0; i < 20; i += 1) {
		BS.logError(`Error ${i}.`, null);
	}

	assert.equal(sent.length, 10);
	assert.equal(sent[1].body.properties.$exception_list[0].value, 'Error 0.');
});

test('sends nothing anywhere else', () => {
	for (const hostname of ['localhost', '192.168.1.20', 'example.com']) {
		const { BS, sent } = setup(hostname);
		BS.logError('Could not load.', new Error('nope'));
		assert.deepEqual(sent, [], hostname);
	}
});
