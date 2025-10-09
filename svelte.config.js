/** @type {import('@sveltejs/kit').Config} */
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/kit/vite';

const production = process.env.NODE_ENV === 'production';
const ons_path = process.env.APP_PATH && process.env.APP_PATH.includes('ons');

const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html'
		}),
		prerender: {
			handleHttpError: 'warn',
			handleMissingId: 'warn',
		},
		paths: {
			base: production && ons_path ? '/visualisations/customprofiles' : '',
			relative: false
		}
	},
	preprocess: vitePreprocess(), // Ensures Svelte processes linked files
	vitePlugin: {
		inspector: true // Enables the Svelte inspector in development (optional)
	}
};

export default config;
