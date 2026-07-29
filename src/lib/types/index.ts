import type { components as V1 } from "$lib/api/schema.v1";
import type { components as V2 } from "$lib/api/schema.v2";

/**
 * App-facing type aliases over the OpenAPI-generated schemas.
 * Regenerate the schemas with `npm run api:gen` when the backend changes.
 *
 * Sheetmusic-set, user and auth types come from the v2.0 document; projects,
 * parts and categories from v1.0. Where the document leaves a response body
 * undefined, a minimal supplementary interface is authored below from observed
 * usage.
 *
 * The documents declare every `int32` as `["integer","string"]` — a
 * `JsonNumberHandling.AllowReadingFromString` artifact of .NET's schema
 * exporter — so `openapi-typescript` widens those fields to `number | string`.
 * The API only ever sends numbers, so the numeric fields the app sorts on and
 * assigns to are pinned back to `number` with `Omit` below. Drop those
 * overrides once the documents stop widening them.
 */

// --- Sheetmusic (v2.0) ---
export type MusicSet = Omit<V2["schemas"]["ApiSet"], "archiveNumber"> & {
  archiveNumber?: number;
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
export type Part = Omit<V1["schemas"]["ApiPart"], "sortOrder"> & {
  sortOrder?: number;
};
export type PartRequest = Omit<V1["schemas"]["PartRequest"], "sortOrder"> & {
  sortOrder?: number;
};

/**
 * UI-only working model for the part create/edit form, mapping onto
 * `PartRequest`. Aliases are not here: the API manages them through dedicated
 * `/parts/{id}/aliases` endpoints, applied one at a time on the part edit page.
 */
export interface PartForm {
  name: string;
  sortOrder: number;
  indexable: boolean;
}

// --- Projects (v1.0) ---
export type NewProjectRequest = V1["schemas"]["NewProjectRequest"];
export type UpdateProjectRequest = V1["schemas"]["UpdateProjectRequest"];
export type SetCollectionRequest = V1["schemas"]["SetCollectionRequest"];

/**
 * `sets` is composed client-side: `ApiProject` carries the project's own fields
 * only, so the pages that need its music sets fetch `/projects/{id}/sets` and
 * attach the result here.
 */
export type Project = V1["schemas"]["ApiProject"] & {
  sets?: MusicSet[];
};

// --- Users (v2.0) ---
// User management runs on v2 throughout, so these all alias the v2 schema —
// including the role and password-reset bodies that previously had to be
// hand-authored while `api:gen` pulled v2 from prod.
export type UserRequest = V2["schemas"]["UserRequest"];
export type UpdateUserRequest = V2["schemas"]["UpdateUserRequest"];
export type AssignRoleRequest = V2["schemas"]["AssignRoleRequest"];
export type ForgotPasswordRequest = V2["schemas"]["ForgotPasswordRequest"];
export type ResetPasswordRequest = V2["schemas"]["ResetPasswordRequest"];

/**
 * The password complexity policy the API enforces, served so a client can show
 * the rules up front instead of hardcoding them. `minimumLength` and
 * `requiredUniqueChars` are pinned back to `number` for the same int32-widening
 * reason as the fields above — both are compared against a password's length.
 */
export type PasswordRequirements = Omit<
  V2["schemas"]["ApiPasswordRequirements"],
  "minimumLength" | "requiredUniqueChars"
> & {
  minimumLength?: number;
  requiredUniqueChars?: number;
};

/**
 * User response shape — not defined in the OpenAPI document, authored here.
 * `GET /users/{identifier}` is documented to answer with "the user details,
 * including assigned roles", but without a schema, so `roles` stays optional —
 * `fetchRoles` reads it to derive access and treats its absence as none.
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

// --- Auth (v2.0) ---
export type AccessTokens = V2["schemas"]["ApiAccessTokens"];

/**
 * Progress of anything that saves without a Lagre button. Anything that writes
 * on its own — an autosaving field, a toggle that takes effect on release — owes
 * the user this, rendered through `ui/SaveIndicator`.
 */
export type SaveState = "idle" | "saving" | "saved";

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
