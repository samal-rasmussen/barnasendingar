import { test, expect, tileTitles } from './app.ts';

for (const file of ['/assets/shows.json', '/components/tile/tile.html', '/pages/show/show.html']) {
	test(`shows a retry screen when ${file} fails to load`, async ({ page }) => {
		let failing = true;
		await page.route('**' + file, (route) => (failing ? route.abort() : route.fallback()));

		await page.goto('/');
		const retry = page.getByRole('button', { name: 'Royn aftur' });
		await expect(page.getByText('Kundi ikki lesa barnasendingarnar.')).toBeVisible();
		await expect(retry).toBeFocused();

		failing = false;
		await page.keyboard.press('Enter');
		await expect(tileTitles(page)).toHaveCount(3);
	});
}
