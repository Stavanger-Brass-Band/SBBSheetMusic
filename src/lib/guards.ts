import { browser } from "$app/environment";
import { redirect } from "@sveltejs/kit";
import { auth } from "$lib/stores/auth.svelte";
import { primaryRoleLabel } from "$lib/roles";

/**
 * Client-side admin guard for use in a page `load`. Admin state is seeded
 * from localStorage on startup, so it is available synchronously on deep
 * links. SSR is disabled, so the `browser` check keeps this inert during the
 * static fallback build. Use for user administration only.
 */
export function requireAdmin(): void {
  if (browser && !auth.isAdmin) {
    redirect(302, "/");
  }
}

/**
 * Guard for the music-catalogue editors (sets, parts, categories): Admin or
 * Noteansvarlig. Mirrors `requireAdmin`'s seeding/SSR notes.
 */
export function requireManageMusic(): void {
  if (browser && !auth.canManageMusic) {
    redirect(302, "/");
  }
}

/**
 * Guard for the project editors: Admin, Noteansvarlig or Prosjektleder. Wider
 * than `requireManageMusic` — see `MANAGE_PROJECTS_ROLES`.
 */
export function requireManageProjects(): void {
  if (browser && !auth.canManageProjects) {
    redirect(302, "/");
  }
}

/**
 * Guard for the reading side of the catalogue — the archive list. Musikant,
 * Arkivleser, Noteansvarlig or Admin; see `CATALOG_ACCESS_ROLES`. A user with
 * none of them gets nothing but an empty list from the API, so they are sent to
 * Hjem, which explains the missing access instead.
 */
export function requireCatalogAccess(): void {
  if (browser && !auth.canAccessCatalog) {
    redirect(302, "/");
  }
}

/**
 * Guard for the read-only set view reached from the archive (`/set/[id]`):
 * Arkivleser, Noteansvarlig or Admin — see `READ_LIBRARY_ROLES`. A Musikant
 * only ever reaches a set through its active project
 * (`/project/[projectId]/set/[id]`), which carries the project context this
 * view has none of.
 */
export function requireReadLibrary(): void {
  if (browser && !auth.canReadLibrary) {
    redirect(302, "/");
  }
}

/**
 * Guard for the self-service profile page (`/profile`). Temporarily closed to
 * a pure Musikant: that role is currently issued as one shared login used by
 * many real people, so letting any of them change its name, email or password
 * would affect everyone else signed in as it. Lift this once every member has
 * their own account — the API itself has no such restriction, this is purely
 * a rollout gate. Mirrors `AccountMenu`'s `showProfileLink`, which hides the
 * entry point the same way.
 */
export function requireIndividualAccount(): void {
  if (browser && primaryRoleLabel(auth) === "Musikant") {
    redirect(302, "/");
  }
}
