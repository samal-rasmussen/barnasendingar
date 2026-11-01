import { test, expect } from '@playwright/test';
import { loadComponents } from './mount.ts';

test.beforeEach(async ({ page }) => {
	await loadComponents(page, ['tile']);
});

async function mountTile(page: import('@playwright/test').Page, watched: boolean) {
	await page.evaluate((watched) => {
		window.testActivations = 0;
		const tile = window.BS.components.tile({
			title: 'Alfa og Beta',
			image: '/favicon.png',
			imageAlt: 'Sending',
			watched,
			onActivate: () => {
				window.testActivations += 1;
			}
		});
		document.getElementById('root')!.appendChild(tile.element);
	}, watched);
}

const activations = (page: import('@playwright/test').Page) =>
	page.evaluate(() => window.testActivations);

test('shows the title and image', async ({ page }) => {
	await mountTile(page, false);

	await expect(page.locator('h2')).toHaveText('Alfa og Beta');
	await expect(page.locator('img')).toHaveAttribute('src', '/favicon.png');
	await expect(page.locator('img')).toHaveAttribute('alt', 'Sending');
});

test('shows the "Sæð" marker only when watched', async ({ page }) => {
	await mountTile(page, false);
	await expect(page.locator('.watched')).toHaveCount(0);

	await mountTile(page, true);
	await expect(page.locator('.watched')).toHaveText('Sæð');
});

test('can be focused and opened with Enter, Space or a click', async ({ page }) => {
	await mountTile(page, false);
	const tile = page.getByRole('button');

	await page.keyboard.press('Tab');
	await expect(tile).toBeFocused();

	await page.keyboard.press('Enter');
	await page.keyboard.press('Space');
	await tile.click();
	expect(await activations(page)).toBe(3);
});
