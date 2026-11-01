import { test, expect, tileTitles, qualityOptions, withoutFullscreen } from './app.ts';

test('browse from the front page to an episode and back with the remote', async ({ page }) => {
	await page.goto('/');
	await expect(tileTitles(page)).toHaveText([
		'Alfa og Beta',
		'Søgur / Ævintýr á Øy',
		'Einki video'
	]);

	// The remote moves focus like Tab and selects with Enter/OK.
	await page.keyboard.press('Tab');
	await expect(page.getByRole('button', { name: 'Alfa og Beta' })).toBeFocused();
	await page.keyboard.press('Enter');

	await expect(page.locator('h1')).toHaveText('Alfa og Beta');
	await expect(page).toHaveTitle('Alfa og Beta - Barnasendingar');
	await expect(tileTitles(page)).toHaveText(['Partur 1', 'Partur 2', 'Partur 3']);

	await page.getByRole('button', { name: 'Partur 2' }).click();
	await expect(page).toHaveTitle('Partur 2 - Alfa og Beta - Barnasendingar');
	await expect(page.locator('.episode-heading')).toContainText('Partur 2');
	await expect(qualityOptions(page)).toHaveText(['Auto', '360p', '720p']);

	// Opening an episode puts the player in fullscreen. Leave it to reach the back button.
	await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe('VIDEO');
	await page.evaluate(() => document.exitFullscreen());

	await page.locator('.episode-header button.icon').first().click();
	await expect(tileTitles(page)).toHaveText(['Partur 1', 'Partur 2', 'Partur 3']);
});

test('the show page back button leads to the front page', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Alfa og Beta' }).click();
	await expect(tileTitles(page)).toHaveText(['Partur 1', 'Partur 2', 'Partur 3']);

	await page.locator('.actions button.icon').click();
	await expect(page.locator('h1')).toHaveText('Barnasendingar');
	await expect(tileTitles(page)).toHaveCount(3);
});

test('back from a show after watching an episode leads to the front page', async ({ page }) => {
	await withoutFullscreen(page);
	await page.goto('/');
	await page.getByRole('button', { name: 'Alfa og Beta' }).click();
	await page.getByRole('button', { name: 'Partur 2' }).click();
	await expect(qualityOptions(page)).toHaveCount(3);

	await page.locator('.episode-header button.icon').first().click();
	await expect(tileTitles(page)).toHaveText(['Partur 1', 'Partur 2', 'Partur 3']);
	await page.locator('.actions button.icon').click();
	await expect(page.locator('h1')).toHaveText('Barnasendingar');
});

test('back buttons stay in the app after opening an episode by its address', async ({ page }) => {
	await withoutFullscreen(page);
	await page.goto('/#/sending/Alfa%20og%20Beta/partur/Partur%202');
	await expect(qualityOptions(page)).toHaveCount(3);
	const historyLength = await page.evaluate(() => history.length);

	await page.locator('.episode-header button.icon').first().click();
	await expect(tileTitles(page)).toHaveText(['Partur 1', 'Partur 2', 'Partur 3']);
	await page.locator('.actions button.icon').click();
	await expect(page.locator('h1')).toHaveText('Barnasendingar');

	// Each back button replaced the page, so history didn't grow and the
	// browser's own back button doesn't return to the episode.
	expect(await page.evaluate(() => history.length)).toBe(historyLength);
	expect(await page.evaluate(() => location.hash)).toBe('#/');
});

test('"Sæð" marks watched episodes until it is reset', async ({ page }) => {
	await page.addInitScript(() => {
		if (!sessionStorage.getItem('seeded')) {
			sessionStorage.setItem('seeded', '1');
			localStorage.setItem('watched', JSON.stringify({ 'Alfa og Beta': { '1': true, '3': true } }));
		}
	});
	await page.goto('/#/sending/Alfa%20og%20Beta');

	const watchedTiles = page.locator('.grid-item').filter({ has: page.locator('.watched') });
	await expect(watchedTiles.locator('h2')).toHaveText(['Partur 1', 'Partur 3']);

	await page.getByRole('button', { name: 'Nulstilla "Sæð"' }).click();
	await expect(page.locator('.watched')).toHaveCount(0);

	await page.reload();
	await expect(tileTitles(page)).toHaveCount(3);
	await expect(page.locator('.watched')).toHaveCount(0);
});
