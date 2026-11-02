import type { Page } from '@playwright/test';
import { test, expect, showHash, episodeHash, endVideo, withoutFullscreen } from './app.ts';

const show = 'Alfa og Beta';
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test('the front page focuses the first show, or the show you came back from', async ({ page }) => {
	await page.goto('/');
	await expect(button(page, show)).toBeFocused();

	await button(page, 'Søgur / Ævintýr á Øy').click();
	await button(page, 'Aftur').click();
	await expect(button(page, 'Søgur / Ævintýr á Øy')).toBeFocused();
});

test('the show page focuses the first unwatched episode, or the one you came back from', async ({
	page
}) => {
	await withoutFullscreen(page);
	await page.addInitScript(() => {
		localStorage.setItem('watched', JSON.stringify({ 'Alfa og Beta': { '1': true } }));
	});
	await page.goto('/' + showHash(show));
	await expect(button(page, 'Partur 2')).toBeFocused();

	await button(page, 'Partur 3').click();
	await button(page, 'Aftur').click();
	await expect(button(page, 'Partur 3')).toBeFocused();
});

test('after moving on to the next episode, the show page focuses it', async ({ page }) => {
	await withoutFullscreen(page);
	await page.goto('/' + showHash(show));
	await button(page, 'Partur 1').click();
	await expect(page.locator('video')).toBeFocused();

	await endVideo(page);
	await expect(page).toHaveTitle(`Partur 2 - ${show} - Barnasendingar`);
	await button(page, 'Aftur').click();
	await expect(button(page, 'Partur 2')).toBeFocused();
});

test('an episode without video focuses the back button', async ({ page }) => {
	await page.goto('/' + episodeHash('Einki video', 'Tómur partur'));
	await expect(button(page, 'Aftur')).toBeFocused();
});

test('the not-found page focuses the way back home', async ({ page }) => {
	await page.goto('/#/onki-her');
	await expect(button(page, 'Aftur til forsíðuna')).toBeFocused();
});
