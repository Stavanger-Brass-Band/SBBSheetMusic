// Pure client-side SPA: no SSR, no prerendering of dynamic routes.
// adapter-static emits a single index.html fallback that boots this client.
export const ssr = false;
export const prerender = false;
export const csr = true;
export const trailingSlash = "never";
