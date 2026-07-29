/**
 * The roles the API recognises.
 *
 * They are pre-defined on the backend: nothing creates a role, nothing lists
 * them, and assigning a name outside this list answers `RoleNotFoundError`. So
 * the UI picks from here instead of taking free text, and this list has to be
 * kept in step with the backend by hand.
 *
 * Three tiers (widest access last): `Musikant` reads and downloads only;
 * `Noteansvarlig` additionally manages the music catalogue (sets, parts,
 * projects, categories); `Admin` also administers users and rebuilds the search
 * index.
 */
export const ROLES = ["Musikant", "Noteansvarlig", "Admin"] as const;

export type Role = (typeof ROLES)[number];

/** The role granting administrator rights (user admin) — see `fetchRoles`. */
export const ADMIN_ROLE: Role = "Admin";

/**
 * Roles allowed to manage the music catalogue — create/update/delete of sets,
 * parts, projects and categories. Admin has this by virtue of full access.
 */
export const MANAGE_MUSIC_ROLES: readonly Role[] = ["Noteansvarlig", "Admin"];
