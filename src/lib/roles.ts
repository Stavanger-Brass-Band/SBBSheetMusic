/**
 * The roles the API recognises.
 *
 * They are pre-defined on the backend: nothing creates a role, nothing lists
 * them, and assigning a name outside this list answers `RoleNotFoundError`. So
 * the UI picks from here instead of taking free text, and this list has to be
 * kept in step with the backend by hand.
 */
export const ROLES = ["Reader", "Admin"] as const;

export type Role = (typeof ROLES)[number];

/** The role granting administrator rights — see `fetchIsAdmin`. */
export const ADMIN_ROLE: Role = "Admin";
