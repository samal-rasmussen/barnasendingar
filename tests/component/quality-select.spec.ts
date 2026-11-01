import { test, expect, type Page } from '@playwright/test';
import { loadComponents } from './mount.ts';

test.beforeEach(async ({ page }) => {
	await loadComponents(page, ['quality-select']);
	await page.evaluate(() => {
		window.testChanges = [];
		window.testQuality = window.BS.components.qualitySelect({
			id: 'quality-test',
			onChange: (level: number) => window.testChanges.push(level)
		});
		document.getElementById('root')!.appendChild(window.testQuality.element);
	});
});

const select = (page: Page) => page.getByLabel('Góðska');
const changes = (page: Page) => page.evaluate(() => window.testChanges);
const setLevels = (page: Page, levels: object[]) =>
	page.evaluate((levels) => window.testQuality.setLevels(levels), levels);

test('starts disabled with only Auto', async ({ page }) => {
	await expect(select(page)).toBeDisabled();
	await expect(select(page).locator('option')).toHaveText(['Auto']);
});

test('labels levels by height, then bitrate, then position', async ({ page }) => {
	await setLevels(page, [{ height: 720, bitrate: 2000000 }, { bitrate: 800000 }, {}]);

	await expect(select(page)).toBeEnabled();
	await expect(select(page).locator('option')).toHaveText(['Auto', '720p', '800 kbps', 'Góðska 3']);
	await expect(select(page)).toHaveValue('-1');
});

test('reports the chosen level, with -1 for Auto', async ({ page }) => {
	await setLevels(page, [{ height: 360 }, { height: 720 }]);

	await select(page).selectOption({ label: '720p' });
	await select(page).selectOption({ label: 'Auto' });
	expect(await changes(page)).toEqual([1, -1]);
});

test('resets to Auto and disabled when the levels are cleared', async ({ page }) => {
	await setLevels(page, [{ height: 360 }, { height: 720 }]);
	await select(page).selectOption({ label: '720p' });

	await setLevels(page, []);
	await expect(select(page)).toBeDisabled();
	await expect(select(page)).toHaveValue('-1');
	await expect(select(page).locator('option')).toHaveCount(1);
});

test('stops reporting changes after destroy', async ({ page }) => {
	await setLevels(page, [{ height: 360 }]);
	await page.evaluate(() => window.testQuality.destroy());

	await select(page).selectOption({ label: '360p' });
	expect(await changes(page)).toEqual([]);
});
