import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// Warnings the legacy Rollup build suppressed (rollup.config.js onwarn).
const ignoredWarnings = [
  "a11y_distracting_elements",
  "a11y_click_events_have_key_events",
  "a11y_no_static_element_interactions",
];

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  compilerOptions: {
    warningFilter: (warning) => !ignoredWarnings.includes(warning.code),
  },
  kit: {
    // Static SPA: a single index.html fallback boots the client router for
    // every route. SSR is disabled in src/routes/+layout.ts.
    adapter: adapter({
      pages: "build",
      assets: "build",
      fallback: "index.html",
      precompress: false,
      strict: false,
    }),
  },
};

export default config;
