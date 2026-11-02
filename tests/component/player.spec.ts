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
	await loadComponents(page, ['player']);
	await page.evaluate(() => {
		window.testLevels = [];
		window.testEnded = 0;
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

test('reports no levels when loading, then the stream levels', async ({ page }) => {
	await load(page, 'https://video.test/a/master.m3u8');

	await expect.poll(() => levels(page)).toEqual([[], [360, 720]]);
	expect(playlistRequests).toEqual(['https://video.test/a/master.m3u8']);
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
