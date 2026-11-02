import { test, expect, type Page } from '@playwright/test';
import { loadComponents } from './mount.ts';

test.beforeEach(async ({ page }) => {
	await loadComponents(page, ['tile']);
});

async function mountTile(page: Page, watched: boolean) {
	await page.evaluate((watched) => {
		window.testActivations = 0;
		window.testTile = window.BS.components.tile({
			title: 'Alfa og Beta',
			image: '/favicon.png',
			watched,
			onActivate: () => {
				window.testActivations += 1;
			}
		});
		document.getElementById('root')!.appendChild(window.testTile.element);
	}, watched);
}

const activations = (page: Page) => page.evaluate(() => window.testActivations);
const marker = (page: Page) => page.getByText('Sæð');

test('is a button named by its title, with a decorative image', async ({ page }) => {
	await mountTile(page, false);

	await expect(page.getByRole('button', { name: 'Alfa og Beta' })).toBeVisible();
	await expect(page.locator('img')).toHaveAttribute('src', '/favicon.png');
	await expect(page.locator('img')).toHaveAttribute('alt', '');
});

test('shows the "Sæð" marker when watched, and setWatched toggles it', async ({ page }) => {
	await mountTile(page, true);
	await expect(marker(page)).toBeVisible();

	await page.evaluate(() => window.testTile.setWatched(false));
	await expect(marker(page)).toBeHidden();

	await page.evaluate(() => window.testTile.setWatched(true));
	await expect(marker(page)).toBeVisible();
});

test('starts without the marker when not watched', async ({ page }) => {
	await mountTile(page, false);
	await expect(marker(page)).toBeHidden();
});

test('can be focused and opened with Enter, Space or a click', async ({ page }) => {
	await mountTile(page, false);
	const tile = page.getByRole('button');

	await page.evaluate(() => window.testTile.focus());
	await expect(tile).toBeFocused();

	await page.keyboard.press('Enter');
	await page.keyboard.press('Space');
	await tile.click();
	expect(await activations(page)).toBe(3);
});
