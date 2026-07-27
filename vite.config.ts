import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // `API_PROXY_TARGET` (set in local `.env`) opts into a dev-only reverse
  // proxy. The browser hits the SPA's own origin under `/proxy-api`, and Vite
  // forwards to the real API server-side — sidestepping CORS, since the test
  // API doesn't send `Access-Control-Allow-Origin` for http://localhost:5100.
  // Unset in CI, so production builds (which don't run this dev server) are
  // unaffected.
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.API_PROXY_TARGET;

  return {
    plugins: [tailwindcss(), sveltekit()],
    server: {
      // Preserve the historical local dev port from the old sirv setup.
      port: 5100,
      proxy: apiProxyTarget
        ? {
            "/proxy-api": {
              target: apiProxyTarget,
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.replace(/^\/proxy-api/, ""),
            },
          }
        : undefined,
    },
  };
});
