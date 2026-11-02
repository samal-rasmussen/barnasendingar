import { test, expect } from '@playwright/test';
import { loadComponents } from './mount.ts';

test('every icon in the sprite renders inside an icon button', async ({ page }) => {
	await loadComponents(page, ['icon', 'button']);

	const names = await page.evaluate(() => {
		const root = document.getElementById('root')!;
		const symbols = document.querySelectorAll('.icon-sprite symbol');
		const result: string[] = [];
		for (let i = 0; i < symbols.length; i += 1) {
			const name = symbols[i].id.replace(/^icon-/, '');
			root.insertAdjacentHTML(
				'beforeend',
				`<button type="button" class="button button-icon" aria-label="${name}" title="${name}">` +
					`<svg class="icon" aria-hidden="true" focusable="false"><use xlink:href="#icon-${name}"></use></svg>` +
					'</button>'
			);
			result.push(name);
		}
		return result;
	});

	expect(names).toEqual(['back', 'fullscreen']);
	for (const name of names) {
		// The <use> only has a size if it found its symbol and drew it.
		const box = await page
			.getByRole('button', { name })
			.locator('use')
			.evaluate((use) => use.getBoundingClientRect());
		expect(box.width, name).toBeGreaterThan(0);
		expect(box.height, name).toBeGreaterThan(0);
	}
});
