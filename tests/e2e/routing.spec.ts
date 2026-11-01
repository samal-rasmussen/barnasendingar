import { test, expect, showHash, episodeHash, tileTitles } from './app.ts';

const show = 'Søgur / Ævintýr á Øy';

test('deep links open shows and episodes with special characters in their titles', async ({
	page
}) => {
	await page.goto('/' + showHash(show));
	await expect(page.locator('h1')).toHaveText(show);
	await expect(tileTitles(page)).toHaveText(['Hvat er #1?', 'Partur & meira']);

	await page.getByRole('button', { name: 'Hvat er #1?' }).click();
	await expect(page).toHaveTitle(`Hvat er #1? - ${show} - Barnasendingar`);
	expect(await page.evaluate(() => location.hash)).toBe(episodeHash(show, 'Hvat er #1?'));

	await page.reload();
	await expect(page).toHaveTitle(`Hvat er #1? - ${show} - Barnasendingar`);
});

test('unknown addresses show the not-found page, which leads home', async ({ page }) => {
	for (const hash of ['#/onki-her', showHash('Finst ikki'), episodeHash(show, 'Finst ikki')]) {
		await page.goto('/' + hash);
		await expect(page.locator('h1')).toHaveText('Ikki funnið');
	}

	await page.getByRole('button', { name: 'Aftur til forsíðuna' }).click();
	await expect(tileTitles(page)).toHaveCount(3);
});
