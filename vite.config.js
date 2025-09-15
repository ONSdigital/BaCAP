import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [sveltekit()],
  server: {
    watch: {
      ignored: ["!**/node_modules/@onsvisual/svelte-components/dist/**"], // ✅ Force Vite to watch the package
    },
    fs: {
      allow: [".."], // ✅ Allow accessing parent folders (important for linked packages)
    },
  },
  resolve: {
    preserveSymlinks: true, // ✅ Ensures Vite does not resolve symlinked packages incorrectly
  }
};

export default config;
