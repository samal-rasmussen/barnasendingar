import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		target: ['es2017', 'chrome69'],
	},
	plugins: [sveltekit()],
});
