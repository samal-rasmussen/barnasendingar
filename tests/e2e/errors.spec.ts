import { test, expect } from './app.ts';

const throwLater = () =>
	setTimeout(() => {
		throw new Error('Testfeilur');
	});

test('lists errors in an overlay with ?debug', async ({ page }) => {
	await page.goto('/?debug#/');
	await expect(page.locator('#errors-info')).toContainText('sending to PostHog: no');

	await page.evaluate(throwLater);

	await expect(page.locator('#errors-list')).toContainText(/Uncaught.*: Error: Testfeilur/);
	await expect(page.locator('.tile').first()).toBeFocused();
});

test('shows no overlay without ?debug', async ({ page }) => {
	await page.goto('/#/');
	await page.evaluate(throwLater);

	await expect(page.locator('.tile-title')).not.toHaveCount(0);
	await expect(page.locator('#errors-overlay')).toBeHidden();
});
