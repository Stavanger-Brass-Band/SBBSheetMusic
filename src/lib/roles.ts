/**
 * The roles the API recognises.
 *
 * They are pre-defined on the backend: nothing creates a role, nothing lists
 * them, and assigning a name outside this list answers `RoleNotFoundError`. So
 * the UI picks from here instead of taking free text, and this list has to be
 * kept in step with the backend by hand.
 *
 * The roles are **not** a single escalating tier — they are independent grants a
 * user can hold in any combination, and their rights add up. `Musikant` reads
 * and downloads; `Noteansvarlig` manages the music catalogue (sets, parts,
 * projects, categories); `Prosjektleder` manages *only* projects, with no rights
 * over sets, parts or categories; `Admin` has everything, including user
 * administration. The order here is the order the role picker lists them in.
 */
export const ROLES = [
  "Musikant",
  "Noteansvarlig",
  "Prosjektleder",
  "Admin",
] as const;

export type Role = (typeof ROLES)[number];

/** The role granting administrator rights (user admin) — see `fetchRoles`. */
export const ADMIN_ROLE: Role = "Admin";

/**
 * Roles allowed to manage the music catalogue — create/update/delete of sets,
 * parts and categories. Mirrors the backend's `ManageMusic` policy.
 */
export const MANAGE_MUSIC_ROLES: readonly Role[] = ["Noteansvarlig", "Admin"];

/**
 * Roles allowed to manage projects — create/update/delete a project and
 * assign/unassign/reorder its sets. Mirrors the backend's `ManageProjects`
 * policy, which is deliberately wider than `ManageMusic`: a `Prosjektleder`
 * runs projects without gaining edit rights anywhere else in the catalogue.
 */
export const MANAGE_PROJECTS_ROLES: readonly Role[] = [
  "Prosjektleder",
  "Noteansvarlig",
  "Admin",
];
