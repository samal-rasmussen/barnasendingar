import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRuntime } from './runtime.ts';

/** A fake XMLHttpRequest that the test answers by hand. */
class FakeXhr {
	static last: FakeXhr;
	url = '';
	aborted = false;
	readyState = 0;
	status = 0;
	responseText = '';
	onreadystatechange: (() => void) | null = null;
	onerror: (() => void) | null = null;

	constructor() {
		FakeXhr.last = this;
	}
	open(_method: string, url: string) {
		this.url = url;
	}
	send() {}
	abort() {
		this.aborted = true;
	}
	respond(status: number, text: string) {
		this.readyState = 4;
		this.status = status;
		this.responseText = text;
		this.onreadystatechange?.();
	}
}

/** Loads http.js with the fake XHR and timers that only run when fired. */
function setup() {
	const timers: (() => void)[] = [];
	const BS = loadRuntime(['core/http.js'], {
		XMLHttpRequest: FakeXhr,
		setTimeout: (callback: () => void) => timers.push(callback),
		clearTimeout: () => {}
	}).BS;
	const results: { error: Error | null; result?: unknown }[] = [];
	const callback = (error: Error | null, result?: unknown) => results.push({ error, result });
	return { http: BS.http, timers, results, callback };
}

test('getJson passes the parsed JSON', () => {
	const { http, results, callback } = setup();

	http.getJson('/a.json', callback);
	FakeXhr.last.respond(200, '{"a":1}');

	assert.equal(FakeXhr.last.url, '/a.json');
	assert.equal(results.length, 1);
	assert.equal(results[0].error, null);
	assert.equal(JSON.stringify(results[0].result), '{"a":1}');
});

test('getJson fails on an error status or text that is not JSON', () => {
	const { http, results, callback } = setup();

	http.getJson('/missing.json', callback);
	FakeXhr.last.respond(404, 'Not found');
	http.getJson('/broken.json', callback);
	FakeXhr.last.respond(200, '{not json');

	assert.equal(results.length, 2);
	assert.match(results[0].error!.message, /Could not load \/missing\.json/);
	assert.equal(results[1].error!.name, 'SyntaxError');
});

test('getText times out once, aborts, and ignores a late answer', () => {
	const { http, timers, results, callback } = setup();

	http.getText('/slow.txt', callback, 1000);
	timers[0]();
	FakeXhr.last.respond(200, 'late');

	assert.equal(FakeXhr.last.aborted, true);
	assert.equal(results.length, 1);
	assert.match(results[0].error!.message, /Timed out loading \/slow\.txt/);
});
