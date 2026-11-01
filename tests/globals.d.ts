// The app's global namespace and test hooks, as seen from page.evaluate().
declare global {
	interface Window {
		BS: any;
		[testHook: `test${string}`]: any;
	}
}

export {};
