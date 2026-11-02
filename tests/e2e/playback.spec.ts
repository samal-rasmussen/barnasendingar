import {
	test,
	expect,
	episodeHash,
	qualityOptions,
	storedWatched,
	endVideo,
	withoutFullscreen
} from './app.ts';

const show = 'Alfa og Beta';

test('plays the episode from its mediaId', async ({ page, playlistRequests }) => {
	await page.goto('/' + episodeHash(show, 'Partur 1'));

	await expect(qualityOptions(page)).toHaveText(['Auto', '360p', '720p']);
	expect(playlistRequests).toEqual([
		'https://vod.kringvarp.fo/redirect/video/_definst_/smil:smil/video/alfa-1.smil?type=m3u8'
	]);
});

test('moves on to the next episode in the same player when one ends', async ({
	page,
	playlistRequests
}) => {
	await page.goto('/' + episodeHash(show, 'Partur 1'));
	await expect(qualityOptions(page)).toHaveCount(3);
	await page.evaluate(() => {
		window.testFirstVideo = document.querySelector('video');
	});

	await endVideo(page);

	await expect(page).toHaveTitle('Partur 2 - Alfa og Beta - Barnasendingar');
	expect(await page.evaluate(() => location.hash)).toBe(episodeHash(show, 'Partur 2'));
	expect(await storedWatched(page)).toEqual({ [show]: { '1': true } });
	await expect.poll(() => playlistRequests.at(-1)).toContain('/alfa-2.smil');
	await expect(qualityOptions(page)).toHaveCount(3);
	// Reusing the <video> element is what keeps the player in fullscreen.
	expect(await page.evaluate(() => document.querySelector('video') === window.testFirstVideo)).toBe(
		true
	);
});

test('stays on the last episode when it ends', async ({ page }) => {
	await page.goto('/' + episodeHash(show, 'Partur 3'));
	await expect(qualityOptions(page)).toHaveCount(3);

	await endVideo(page);

	expect(await storedWatched(page)).toEqual({ [show]: { '3': true } });
	expect(await page.evaluate(() => location.hash)).toBe(episodeHash(show, 'Partur 3'));
	await expect(page).toHaveTitle('Partur 3 - Alfa og Beta - Barnasendingar');
});

test('explains when an episode has no video', async ({ page }) => {
	await page.goto('/' + episodeHash('Einki video', 'Tómur partur'));

	await expect(page.locator('.player-message')).toHaveText('Hesin parturin hevur einki video.');
	await expect(page.locator('video')).toHaveCount(0);
	await expect(page.locator('#quality-selector')).toBeDisabled();
});

test('the header and the video fill the screen without scrolling', async ({ page }) => {
	await withoutFullscreen(page);
	for (const size of [
		{ width: 1920, height: 1080 },
		{ width: 400, height: 700 }
	]) {
		await page.setViewportSize(size);
		await page.goto('/' + episodeHash(show, 'Partur 1'));
		await expect(page.locator('video')).toBeVisible();

		const layout = await page.evaluate(() => ({
			header: document.querySelector('.episode-header')!.getBoundingClientRect().bottom,
			video: document.querySelector('video')!.getBoundingClientRect(),
			scrollHeight: document.documentElement.scrollHeight
		}));
		expect(layout.video.top).toBe(layout.header);
		expect(layout.video.bottom).toBe(size.height);
		expect(layout.scrollHeight).toBe(size.height);
	}
});
