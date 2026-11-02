import type { Page } from '@playwright/test';

/**
 * Opens a blank test page that loads the core scripts plus the given
 * components (folder names under public/components/), with no router or
 * pages, and waits until their HTML files (templates and styles) are loaded. Tests then build the
 * component with page.evaluate() and append it to #root.
 */
export async function loadComponents(page: Page, components: string[]) {
	const scripts = components
		.map((name) => `<script src="/components/${name}/${name}.js"></script>`)
		.join('\n');

	await page.route('**/component-test', (route) =>
		route.fulfill({
			contentType: 'text/html',
			body: `<!doctype html>
<html lang="fo">
<head>
	<meta charset="utf-8" />
	<link rel="stylesheet" href="/core/base.css" />
</head>
<body>
	<main id="root"></main>
	<script src="/core/app.js"></script>
	<script src="/core/util.js"></script>
	<script src="/core/dom.js"></script>
	<script src="/core/templates.js"></script>
	${scripts}
</body>
</html>`
		})
	);

	await page.goto('/component-test');
	await page.evaluate(
		() =>
			new Promise<void>((resolve, reject) => {
				window.BS.templates.load((error: unknown) => (error ? reject(error) : resolve()));
			})
	);
}
