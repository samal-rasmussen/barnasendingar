import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		target: 'es2016',
		minify: false,
		rollupOptions: {
			output: {
				esModule: false,
				inlineDynamicImports: false,
				format: 'umd'
			},
		}
	},
	plugins: [sveltekit()],
});
