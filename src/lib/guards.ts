import { browser } from "$app/environment";
import { redirect } from "@sveltejs/kit";
import { auth } from "$lib/stores/auth.svelte";

/**
 * Client-side admin guard for use in a page `load`. Admin state is seeded
 * from localStorage on startup, so it is available synchronously on deep
 * links. SSR is disabled, so the `browser` check keeps this inert during the
 * static fallback build.
 */
export function requireAdmin(): void {
  if (browser && !auth.isAdmin) {
    redirect(302, "/");
  }
}
