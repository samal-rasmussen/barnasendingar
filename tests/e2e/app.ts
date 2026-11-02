import { test as base, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { fulfillMasterPlaylist } from '../fixtures/hls.ts';

const fixtureShows = fileURLToPath(new URL('../fixtures/shows.json', import.meta.url));

/**
 * The app running against tests/fixtures/shows.json, with every request
 * outside the local server blocked except fake HLS master playlists.
 * `playlistRequests` collects the playlist URLs the player asked for.
 */
export const test = base.extend<{ playlistRequests: string[] }>({
	playlistRequests: async ({}, use) => {
		await use([]);
	},
	page: async ({ page, playlistRequests }, use) => {
		await page.route(/^https?:\/\/(?!localhost[:/])/, (route) => {
			const url = route.request().url();
			if (url.startsWith('https://vod.kringvarp.fo/') && url.includes('.smil?type=m3u8')) {
				playlistRequests.push(url);
				return fulfillMasterPlaylist(route);
			}
			return route.abort();
		});
		await page.route('**/assets/shows.json', (route) => route.fulfill({ path: fixtureShows }));
		await use(page);
	}
});

export { expect };

export const showHash = (show: string) => `#/sending/${encodeURIComponent(show)}`;
export const episodeHash = (show: string, episode: string) =>
	`${showHash(show)}/partur/${encodeURIComponent(episode)}`;

export const tileTitles = (page: Page) => page.locator('.tile-title');
export const qualityOptions = (page: Page) => page.locator('#quality-selector option');

/** The watch history as the app stored it in localStorage. */
export const storedWatched = (page: Page) =>
	page.evaluate(() => JSON.parse(localStorage.getItem('watched') || '{}'));

/** Fires the video's `ended` event, as if the episode played to the end. */
export const endVideo = (page: Page) =>
	page.locator('video').evaluate((video) => video.dispatchEvent(new Event('ended')));

/**
 * Makes the player's fullscreen requests do nothing, for tests that use the
 * page around the player. Call before page.goto().
 */
export const withoutFullscreen = (page: Page) =>
	page.addInitScript(() => {
		Element.prototype.requestFullscreen = () => Promise.resolve();
	});
