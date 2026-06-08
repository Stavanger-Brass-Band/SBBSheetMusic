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
export type MusicSet = V2["schemas"]["ApiSet"];
export type MusicSetPart = V2["schemas"]["ApiSheetMusicPart"];
export type SetRequest = V2["schemas"]["SetRequest"];

// --- Parts catalog (v1.0) ---
export type Part = V1["schemas"]["ApiPart"];

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

// --- Users (v1.0) ---
export type UserRequest = V1["schemas"]["UserRequest"];
export type UpdateUserRequest = V1["schemas"]["UpdateUserRequest"];

/** User response shape — not defined in the OpenAPI spec, authored here. */
export interface User {
  id: string;
  name: string | null;
  email: string | null;
  inactive: boolean;
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
