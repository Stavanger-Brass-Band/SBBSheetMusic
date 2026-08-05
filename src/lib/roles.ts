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
 * and downloads the notes of *active* projects; `Arkivleser` reads and downloads
 * the whole library, active or not; `Noteansvarlig` manages the music catalogue
 * (sets, parts, projects, categories); `Prosjektleder` manages *only* projects,
 * with no rights over sets, parts or categories; `Admin` has everything,
 * including user administration. The order here is the order the role picker
 * lists them in — read as widening access, so `Prosjektleder` comes before
 * `Noteansvarlig`, which is the closest of them to a full administrator.
 */
export const ROLES = [
  "Musikant",
  "Arkivleser",
  "Prosjektleder",
  "Noteansvarlig",
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

/**
 * Roles that see the *whole* library: every set and every project, whether the
 * project is running or not, with downloads to match. Mirrors the backend's
 * `CatalogAccessService.HasFullLibraryAccess`.
 */
export const READ_LIBRARY_ROLES: readonly Role[] = [
  "Arkivleser",
  "Noteansvarlig",
  "Admin",
];

/**
 * Roles with any catalog access at all. A `Musikant` is narrowed to the active
 * projects — the API filters collections to them and answers 403 for anything
 * outside — while the roles above see everything. A user holding none of these
 * gets no sets, no projects and no download tokens, so the UI offers them
 * neither.
 */
export const CATALOG_ACCESS_ROLES: readonly Role[] = [
  "Musikant",
  ...READ_LIBRARY_ROLES,
];

/** Whether `role` is among `roles`, comparing the way the API does: casefolded. */
export const holdsRole = (roles: string[], role: string): boolean =>
  roles.some((held) => held.toLowerCase() === role.toLowerCase());

/** Whether any of `allowed` is held — roles combine, so one match is enough. */
export const holdsAnyRole = (
  roles: string[],
  allowed: readonly string[],
): boolean => allowed.some((role) => holdsRole(roles, role));

/** What the UI may offer a user, derived from the roles they hold. */
export interface Capabilities {
  isAdmin: boolean;
  canManageMusic: boolean;
  canManageProjects: boolean;
  canReadLibrary: boolean;
  canAccessCatalog: boolean;
}

/**
 * The capabilities a set of role names grants. Pure, so it is the one place
 * that decides what a role may do — the auth store only caches the answer.
 */
export function capabilitiesFrom(roles: string[]): Capabilities {
  return {
    isAdmin: holdsRole(roles, ADMIN_ROLE),
    canManageMusic: holdsAnyRole(roles, MANAGE_MUSIC_ROLES),
    canManageProjects: holdsAnyRole(roles, MANAGE_PROJECTS_ROLES),
    canReadLibrary: holdsAnyRole(roles, READ_LIBRARY_ROLES),
    canAccessCatalog: holdsAnyRole(roles, CATALOG_ACCESS_ROLES),
  };
}

/**
 * The single role name the account menu shows next to a user's name — the
 * widest-access role they hold, in the same widening-toward-admin order as
 * `ROLES`. A `Noteansvarlig` who also happens to hold `Musikant` still reads as
 * "Noteansvarlig": the wider grant is what explains the admin-gated controls
 * they see, so it is the one worth naming. Holding none of the five roles
 * reads as "Medlem" — the ticket's catch-all for no catalog access and no
 * admin rights.
 *
 * Each `else if` is unambiguous because the ones above it have already been
 * ruled out: e.g. `canManageMusic` combines only `Noteansvarlig` and `Admin`
 * (see `MANAGE_MUSIC_ROLES`), and `isAdmin` is already excluded by the first
 * check, so reaching this branch can only mean `Noteansvarlig`.
 */
export function primaryRoleLabel(capabilities: Capabilities): string {
  if (capabilities.isAdmin) return "Administrator";
  if (capabilities.canManageMusic) return "Noteansvarlig";
  if (capabilities.canManageProjects) return "Prosjektleder";
  if (capabilities.canReadLibrary) return "Arkivleser";
  if (capabilities.canAccessCatalog) return "Musikant";
  return "Medlem";
}
