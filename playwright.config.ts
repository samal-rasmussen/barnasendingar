import { defineConfig, devices } from '@playwright/test';

const port = 4388;

export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	reporter: 'list',
	use: {
		baseURL: `http://localhost:${port}`,
		trace: 'retain-on-failure'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: `npx sirv public --dev --single --port ${port}`,
		url: `http://localhost:${port}`,
		reuseExistingServer: false
	}
});
