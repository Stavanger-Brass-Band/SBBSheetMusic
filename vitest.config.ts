import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Unit tests only — the suite covers the modules that decide what a role may
 * see and do (`$lib/roles`, `$lib/utils/download`), which are plain TypeScript.
 * The SvelteKit plugin is deliberately left out: it would pull `$env/static/*`
 * and the generated route types into every run. `$lib` is aliased by hand and
 * the Svelte plugin is here so `.svelte.ts` rune modules compile if a test ever
 * needs one.
 */
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
