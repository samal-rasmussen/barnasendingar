import { test, expect, tileTitles } from './app.ts';

for (const file of ['/assets/shows.json', '/components/tile/tile.html', '/pages/show/show.html']) {
	test(`shows a retry screen when ${file} fails to load`, async ({ page }) => {
		let failing = true;
		await page.route('**' + file, (route) => (failing ? route.abort() : route.fallback()));

		await page.goto('/');
		const retry = page.getByRole('button', { name: 'Royn aftur' });
		await expect(page.getByText('Kundi ikki lesa barnasendingarnar.')).toBeVisible();
		await expect(retry).toBeFocused();
		await expect(page.getByText('Lesur barnasendingar...')).toBeHidden();

		failing = false;
		await page.keyboard.press('Enter');
		await expect(tileTitles(page)).toHaveCount(3);
	});
}

test('shows a loading screen until the catalogue has loaded', async ({ page }) => {
	let release = () => {};
	const released = new Promise<void>((resolve) => (release = resolve));
	await page.route('**/assets/shows.json', async (route) => {
		await released;
		await route.fallback();
	});

	await page.goto('/');
	const loading = page.getByText('Lesur barnasendingar...');
	await expect(loading).toBeVisible();

	release();
	await expect(tileTitles(page)).toHaveCount(3);
	await expect(loading).toBeHidden();
});
