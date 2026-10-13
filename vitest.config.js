import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
	// Compiles Svelte runes in .svelte.js files and resolves Svelte component packages
	plugins: [svelte()],
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
			"$app/paths": fileURLToPath(new URL("./src/test/app-paths-stub.js", import.meta.url))
		}
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.js"]
	}
});
