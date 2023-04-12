import { defineConfig } from 'vite';
// import { splitVendorChunkPlugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'chrome58',
    minify: false,
  },
  // base: './',
  plugins: [
    svelte(),
    // splitVendorChunkPlugin()
  ],
});
