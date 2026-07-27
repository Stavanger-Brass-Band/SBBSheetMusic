import type { components as V1 } from "$lib/api/schema.v1";
import type { components as V2 } from "$lib/api/schema.v2";

/**
 * App-facing type aliases over the OpenAPI-generated schemas.
 * Regenerate the schemas with `npm run api:gen` when the backend changes.
 *
 * Sheetmusic-set types come from the v2.0 spec; projects/users/parts/auth
 * come from v1.0. Where the spec leaves a response body undefined, a minimal
 * supplementary interface is authored below from observed usage.
 */

// --- Sheetmusic (v2.0) ---
/**
 * `categories` is hand-added: the set endpoints return it on the v2 test spec,
 * but `api:gen` generates v2 from prod, where categories are not deployed yet.
 * Drop the intersection once prod's `ApiSet` carries the field.
 */
export type MusicSet = V2["schemas"]["ApiSet"] & {
  categories?: Category[] | null;
};
export type MusicSetPart = V2["schemas"]["ApiSheetMusicPart"];
export type SetRequest = V2["schemas"]["SetRequest"];

// --- Categories (catalog on v1.0, set assignment on v2.0) ---
export type Category = V1["schemas"]["ApiCategory"];
export type CategoryRequest = V1["schemas"]["CategoryRequest"];
export type AssignCategoryRequest = V1["schemas"]["AssignCategoryRequest"];

/** UI-only working model for the category create/edit form. */
export interface CategoryForm {
  name: string;
  active: boolean;
}

// --- Parts catalog (v1.0) ---
export type Part = V1["schemas"]["ApiPart"];
export type PartRequest = V1["schemas"]["PartRequest"];

/**
 * UI-only working model for the part create/edit form. `name`/`sortOrder`/
 * `indexable` map onto `PartRequest`; `aliases` is a plain editable string
 * array (the API exposes aliases read-only on the part and manages additions
 * and removals through dedicated `/parts/{id}/aliases` endpoints).
 */
export interface PartForm {
  name: string;
  sortOrder: number;
  indexable: boolean;
  aliases: string[];
}

// --- Projects (v1.0) ---
export type NewProjectRequest = V1["schemas"]["NewProjectRequest"];
export type UpdateProjectRequest = V1["schemas"]["UpdateProjectRequest"];
export type SetCollectionRequest = V1["schemas"]["SetCollectionRequest"];

/** Project response shape — not defined in the OpenAPI spec, authored here. */
export interface Project {
  id: string;
  name: string | null;
  startDate: string;
  endDate: string;
  comments?: string | null;
  sets?: MusicSet[];
}

// --- Users ---
// UserRequest/UpdateUserRequest are identical in v1 and v2, so the v1 aliases
// stand. The remaining request types below exist only in the v2 spec, which
// currently lives in the test environment and is therefore not in the
// generated (prod) schema files — hand-authored here until `api:gen` can pull
// v2 users from prod.
export type UserRequest = V1["schemas"]["UserRequest"];
export type UpdateUserRequest = V1["schemas"]["UpdateUserRequest"];

/** v2 `AssignRoleRequest`. */
export interface AssignRoleRequest {
  roleName: string | null;
}

/** v2 `ForgotPasswordRequest`. */
export interface ForgotPasswordRequest {
  email: string | null;
}

/** v2 `ResetPasswordRequest`. */
export interface ResetPasswordRequest {
  email: string | null;
  token: string | null;
  newPassword: string | null;
}

/**
 * User response shape — not defined in the OpenAPI spec, authored here.
 * `roles` is assumed present on the v2 response (role management exists but the
 * GET body is undefined in the spec); treated as optional so v1 responses that
 * omit it stay valid.
 */
export interface User {
  id: string;
  name: string | null;
  email: string | null;
  inactive: boolean;
  roles?: string[] | null;
}

/**
 * UI-only working model for the user create/edit form. `active` maps onto the
 * activate/deactivate endpoints and `roles` onto the role endpoints — both
 * applied by diffing on save, not sent in the update body.
 */
export interface UserForm {
  name: string;
  email: string;
  password: string;
  active: boolean;
  roles: string[];
}

// --- Auth (v1.0) ---
export type AccessTokens = V1["schemas"]["ApiAccessTokens"];

/**
 * UI-only view model for the file-upload flow in the set editor. Wraps a
 * browser File with the transient state the upload UI tracks; deliberately
 * kept out of the wire types.
 */
export interface UploadFile {
  file: File;
  name: string;
  isCheckingStatus?: boolean;
  suggestedPart?: Part;
  uploadSuccess?: boolean;
  uploadErrorMessage?: string;
}
