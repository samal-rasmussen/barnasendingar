import { test, expect, type Page } from '@playwright/test';
import { loadComponents } from './mount.ts';
import { fulfillMasterPlaylist } from '../fixtures/hls.ts';

let playlistRequests: string[];

test.beforeEach(async ({ page }) => {
	playlistRequests = [];
	// Only master playlists are served, so the level playlists they point to fail.
	await page.route('https://video.test/**', (route) => {
		const url = route.request().url();
		if (!url.endsWith('/master.m3u8')) {
			return route.abort();
		}
		playlistRequests.push(url);
		return fulfillMasterPlaylist(route);
	});
	await page.addInitScript(() => {
		Element.prototype.requestFullscreen = () => Promise.resolve();
	});
	await page.clock.install();
	await loadComponents(page, ['player']);
	await page.evaluate(() => {
		window.testLevels = [];
		window.testEnded = 0;
		window.testLogged = [];
		window.BS.logError = (message: string, details: unknown) =>
			window.testLogged.push(`${message} ${details}`);
		window.testRecoveries = 0;
		const recoverMediaError = (window as any).Hls.prototype.recoverMediaError;
		(window as any).Hls.prototype.recoverMediaError = function () {
			window.testRecoveries += 1;
			return recoverMediaError.call(this);
		};
		window.testPlayer = window.BS.components.player({
			onLevels: (levels: Array<{ height?: number }>) =>
				window.testLevels.push(levels.map((level) => level.height)),
			onEnded: () => (window.testEnded += 1)
		});
		document.getElementById('root')!.appendChild(window.testPlayer.element);
	});
});

const load = (page: Page, src: string) =>
	page.evaluate((src) => window.testPlayer.load({ src, poster: '/favicon.png' }), src);
const levels = (page: Page) => page.evaluate(() => window.testLevels);
const endVideo = (page: Page) =>
	page.locator('video').evaluate((video) => video.dispatchEvent(new Event('ended')));
const logged = (page: Page) => page.evaluate(() => window.testLogged);
/** Makes the video report the given properties, such as `error` or `duration`. */
const fakeVideo = (page: Page, properties: Record<string, unknown>) =>
	page.locator('video').evaluate((video, properties) => {
		for (const [name, value] of Object.entries(properties)) {
			Object.defineProperty(video, name, { value, configurable: true });
		}
	}, properties);

test('reports no levels when loading, then the stream levels', async ({ page }) => {
	await load(page, 'https://video.test/a/master.m3u8');

	await expect.poll(() => levels(page)).toEqual([[], [360, 720]]);
	expect(playlistRequests).toEqual(['https://video.test/a/master.m3u8']);
});

test('keeps the buffer small enough for Samsung TVs', async ({ page }) => {
	await page.evaluate(() => {
		const loadSource = (window as any).Hls.prototype.loadSource;
		(window as any).Hls.prototype.loadSource = function (src: string) {
			window.testHlsConfig = this.config;
			return loadSource.call(this, src);
		};
	});
	await load(page, 'https://video.test/a/master.m3u8');

	const config = await page.evaluate(() => window.testHlsConfig);
	expect(config.maxMaxBufferLength).toBeLessThanOrEqual(30);
	expect(config.maxBufferSize).toBeLessThanOrEqual(20 * 1000 * 1000);
});

test('loads a new source into the same video element', async ({ page }) => {
	await load(page, 'https://video.test/a/master.m3u8');
	await expect.poll(() => levels(page)).toHaveLength(2);
	await page.evaluate(() => {
		window.testFirstVideo = document.querySelector('video');
	});

	await load(page, 'https://video.test/b/master.m3u8');

	await expect.poll(() => levels(page)).toHaveLength(4);
	expect(playlistRequests).toEqual([
		'https://video.test/a/master.m3u8',
		'https://video.test/b/master.m3u8'
	]);
	expect(await page.evaluate(() => document.querySelector('video') === window.testFirstVideo)).toBe(
		true
	);
});

test('reports when the video ends', async ({ page }) => {
	await load(page, 'https://video.test/a/master.m3u8');
	await endVideo(page);
	expect(await page.evaluate(() => window.testEnded)).toBe(1);
});

test('recovers from a video error, reports it and does not move on', async ({ page }) => {
	await load(page, 'https://video.test/a/master.m3u8');
	await expect.poll(() => levels(page)).toHaveLength(2);

	await fakeVideo(page, { error: { code: 3, message: 'DECODE' } });
	await page.locator('video').evaluate((video) => video.dispatchEvent(new Event('error')));
	await endVideo(page);

	expect(await page.evaluate(() => window.testRecoveries)).toBe(1);
	expect(await page.evaluate(() => window.testEnded)).toBe(0);
	await page.locator('video').evaluate((video) => video.dispatchEvent(new Event('playing')));
	const [error, ended, recovered] = await logged(page);
	expect(error).toMatch(/^Video error, recovering \(attempt 1\)\. at .*MediaError code 3 DECODE$/);
	expect(ended).toMatch(/^Video stopped before the end, not moving on\./);
	expect(recovered).toMatch(/^Recovered from video error\. after [\d.]+s and 1 attempts, /);
});

test('reports playback stuck at one position, once', async ({ page }) => {
	await load(page, 'https://video.test/a/master.m3u8');
	await fakeVideo(page, { paused: false, currentTime: 42 });

	await page.clock.runFor(25_000);

	// The level playlists never load, so hls.js reports those failures too.
	const stuck = (await logged(page)).filter((line: string) => line.startsWith('Playback stuck'));
	expect(stuck).toEqual([
		expect.stringMatching(/^Playback stuck\. at 42\.0s of NaN, .*not paused/)
	]);
});

test('does not move on when the video ends well before its duration', async ({ page }) => {
	await load(page, 'https://video.test/a/master.m3u8');
	await fakeVideo(page, { currentTime: 5, duration: 600 });

	await endVideo(page);

	expect(await page.evaluate(() => window.testEnded)).toBe(0);
	expect(await logged(page)).toEqual([
		expect.stringMatching(/^Video stopped before the end, not moving on\. at 5\.0s of 600\.0s, /)
	]);
});

test('shows a message in place of the video until the next load', async ({ page }) => {
	await page.evaluate(() => window.testPlayer.showMessage('Einki at vísa'));

	await expect(page.getByText('Einki at vísa')).toBeVisible();
	await expect(page.locator('video')).toHaveCount(0);
	expect(await page.evaluate(() => window.testPlayer.focus())).toBe(false);

	await load(page, 'https://video.test/a/master.m3u8');
	await expect(page.getByText('Einki at vísa')).toBeHidden();
	expect(await page.evaluate(() => window.testPlayer.focus())).toBe(true);
	await expect(page.locator('video')).toBeFocused();
});

test('stops everything on destroy', async ({ page }) => {
	await load(page, 'https://video.test/a/master.m3u8');
	await expect.poll(() => levels(page)).toHaveLength(2);

	await page.evaluate(() => window.testPlayer.destroy());
	await endVideo(page);

	expect(await page.evaluate(() => window.testEnded)).toBe(0);
	await expect(page.locator('video')).not.toHaveAttribute('src');
	expect(await page.locator('video').evaluate((video: HTMLVideoElement) => video.paused)).toBe(
		true
	);
});
