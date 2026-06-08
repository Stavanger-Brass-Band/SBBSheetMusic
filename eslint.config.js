import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import prettier from "eslint-config-prettier";
import globals from "globals";
import ts from "typescript-eslint";
import svelteConfig from "./svelte.config.js";

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Opinionated/new rule; hardcoded internal paths are fine here.
      "svelte/no-navigation-without-resolve": "off",
      // Some lists (set parts, file uploads) are intentionally unkeyed: their
      // natural ids are not unique (parts share musicPartId), and keying on a
      // duplicate value throws at runtime. Unkeyed is correct for these.
      "svelte/require-each-key": "off",
    },
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: [".svelte"],
        parser: ts.parser,
        svelteConfig,
      },
    },
  },
  {
    // Generated OpenAPI types and build artifacts are not linted.
    ignores: [
      "build/",
      ".svelte-kit/",
      "static/",
      "src/lib/api/schema.v1.d.ts",
      "src/lib/api/schema.v2.d.ts",
    ],
  },
);
