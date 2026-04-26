import js from '@eslint/js';
import globals from 'globals';

export default [
	{
		ignores: [
			'node_modules/**',
			'dist/**',
			'.svelte-kit/**',
			'downloads/**',
			'public/js/vendor/**',
			'public/assets/shows.json',
			'scripts/**/*.ts',
			'package-lock.json',
			'scripts/package-lock.json'
		]
	},
	js.configs.recommended,
	{
		files: ['public/js/**/*.js'],
		languageOptions: {
			ecmaVersion: 5,
			sourceType: 'script',
			globals: globals.browser
		},
		rules: {
			'no-var': 'off',
			'no-unused-vars': ['error', { caughtErrorsIgnorePattern: '^_' }],
			'prefer-const': 'off'
		}
	},
	{
		files: ['eslint.config.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: globals.node
		}
	}
];
