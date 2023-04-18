import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		target: 'chrome58',
		minify: false,
	},
	plugins: [sveltekit()],
});
