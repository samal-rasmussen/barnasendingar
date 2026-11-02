import { test, expect, type Page } from '@playwright/test';
import { loadComponents } from './mount.ts';

test.beforeEach(async ({ page }) => {
	await loadComponents(page, ['button', 'tile', 'grid']);
});

/** Mounts a grid of tiles with the given titles, and a toolbar button if asked. */
async function mountGrid(page: Page, titles: string[], withToolbar: boolean) {
	await page.evaluate(
		({ titles, withToolbar }) => {
			const BS = window.BS;
			const items = titles.map((title) =>
				BS.components.tile({ title, image: '/favicon.png', onActivate: () => {} })
			);
			let toolbar;
			if (withToolbar) {
				toolbar = document.createElement('button');
				toolbar.className = 'button';
				toolbar.textContent = 'Amboð';
			}
			document.getElementById('root')!.appendChild(BS.components.grid({ toolbar, items }).element);
		},
		{ titles, withToolbar }
	);
}

test('shows the items in order, after the toolbar', async ({ page }) => {
	await mountGrid(page, ['Eitt', 'Tvey', 'Trý'], true);

	const buttons = page.getByRole('button');
	const names = ['Amboð', 'Eitt', 'Tvey', 'Trý'];
	await expect(buttons).toHaveCount(names.length);
	for (const [i, name] of names.entries()) {
		await expect(buttons.nth(i)).toHaveAccessibleName(name);
	}
});

test('lines the toolbar and the last row up with the first column', async ({ page }) => {
	await page.setViewportSize({ width: 1300, height: 800 });
	await mountGrid(page, ['Eitt', 'Tvey', 'Trý', 'Fýra'], true);

	const left = async (name: string) =>
		(await page.getByRole('button', { name, exact: true }).boundingBox())!.x;
	// 1300px wide fits three columns, so "Fýra" starts the second row.
	expect(await left('Fýra')).toBe(await left('Eitt'));
	expect(await left('Amboð')).toBe(await left('Eitt'));
	expect(await left('Tvey')).toBeGreaterThan(await left('Eitt'));
});
