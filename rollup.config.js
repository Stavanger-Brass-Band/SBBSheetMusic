import livereload from "rollup-plugin-livereload";
import rollup_start_dev from "./rollup_start_dev.js";
import svg from "rollup-plugin-svg-import";
import replace from "@rollup/plugin-replace";
import dotenv from "dotenv";
import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";

dotenv.config();

const production = !process.env.ROLLUP_WATCH;

export default {
  input: "src/main.js",
  output: {
    sourcemap: true,
    format: "iife",
    name: "app",
    file: "public/bundle.js",
  },
  plugins: [
    replace({
      preventAssignment: true,
      "process.env.SVELTE_APP_API_URL": JSON.stringify(
        process.env.SVELTE_APP_API_URL
      ),
    }),
    svg({ stringify: true }),
    svelte({
      emitCss: false,
      compilerOptions: {},
      onwarn: (warning, handler) => {
        // e.g. don't warn on <marquee> elements, cos they're cool
        if (warning.code === "a11y-distracting-elements") return;
        if (warning.code === "a11y-click-events-have-key-events") return;
        if (warning.code === "a11y-no-static-element-interactions") return;

        handler(warning);
      },
    }),

    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration 
    // consult the documentation for details:
    // https://github.com/rollup/rollup-plugin-commonjs
    resolve({
      browser: true,
      exportConditions: ["svelte"],
      extensions: [".svelte"],
    }),
    commonjs(),

    // In dev mode, call `npm run start:dev` once
    // the bundle has been generated
    !production && rollup_start_dev,

    // Watch the `public` directory and refresh the
    // browser on changes when not in production
    !production && livereload("public"),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser(),
  ],
  watch: {
    clearScreen: false,
  },
};
