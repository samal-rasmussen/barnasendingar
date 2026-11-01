import { test as base, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const fixtureShows = fileURLToPath(new URL('../fixtures/shows.json', import.meta.url));

// A master playlist with two quality levels. That's enough for hls.js to
// parse the manifest and fill the quality selector. The level playlists and
// video segments are never served, so no real video plays.
const masterPlaylist = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720
720.m3u8
`;

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
				return route.fulfill({
					contentType: 'application/vnd.apple.mpegurl',
					body: masterPlaylist
				});
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

export const tileTitles = (page: Page) => page.locator('.grid-item h2');
export const qualityOptions = (page: Page) => page.locator('#quality-selector option');

/** The watch history as the app stored it in localStorage. */
export const storedWatched = (page: Page) =>
	page.evaluate(() => JSON.parse(localStorage.getItem('watched') || '{}'));

/** Fires the video's `ended` event, as if the episode played to the end. */
export const endVideo = (page: Page) =>
	page.locator('video').evaluate((video) => video.dispatchEvent(new Event('ended')));
