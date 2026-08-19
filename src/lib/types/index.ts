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
/** Body of the part-change endpoint: the part that takes over the assignment. */
export type ChangePartRequest = V2["schemas"]["ChangePartRequest"];

/**
 * A project as it appears inside an expanded set (`$expand=projects`): its id,
 * name and dates, and only for the projects the caller's roles reach. Enough to
 * render a set's usage history without reading the projects themselves.
 */
export type ProjectSummary = V2["schemas"]["ApiProjectSummary"];

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
 * The instrument-group classification a part can carry. Fixed by the backend
 * (an `InstrumentGroup` enum, not user-definable) — a part's group is how its
 * musicians get grouped wherever they're presented. `INSTRUMENT_GROUPS` lists
 * them in the standard brass band section order, which drives the picker.
 */
export type InstrumentGroup = NonNullable<V1["schemas"]["InstrumentGroup"]>;
export const INSTRUMENT_GROUPS: readonly InstrumentGroup[] = [
  "Kornett",
  "Horn og flygelhorn",
  "Euphonium og baryton",
  "Tromboner",
  "Tuba",
  "Slagverk",
];

/**
 * UI-only working model for the part create/edit form, mapping onto
 * `PartRequest`. Aliases are not here: the API manages them through dedicated
 * `/parts/{id}/aliases` endpoints, applied one at a time on the part edit page.
 * `instrumentGroup` uses `""` as the "no group" sentinel since the Flowbite
 * `Select` it binds to works on strings, not `null`.
 */
export interface PartForm {
  name: string;
  sortOrder: number;
  indexable: boolean;
  instrumentGroup: InstrumentGroup | "";
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

/**
 * One appearance of a set on a project — a row of the set's usage history, as
 * the expanded summary settles into once it has an id to be listed by. The dates
 * stay optional: a project whose own dates were never set has none to carry, and
 * the row belongs in the history regardless.
 */
export interface SetProjectUsage {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
}

// --- Users (v2.0) ---
// User management runs on v2 throughout, so these all alias the v2 schema —
// including the role and password-reset bodies that previously had to be
// hand-authored while `api:gen` pulled v2 from prod.
export type UserRequest = V2["schemas"]["UserRequest"];
export type UpdateUserRequest = V2["schemas"]["UpdateUserRequest"];
export type AssignRoleRequest = V2["schemas"]["AssignRoleRequest"];
export type AssignPartsToUserRequest =
  V2["schemas"]["AssignPartsToUserRequest"];
export type ForgotPasswordRequest = V2["schemas"]["ForgotPasswordRequest"];
export type ResetPasswordRequest = V2["schemas"]["ResetPasswordRequest"];

/**
 * A user's profile picture, which is only ever its version — the bytes come
 * from `GET /users/{id}/profile-picture` and never travel with the user. The
 * version changes on every upload, which is what lets a client tell the picture
 * it holds from the one now stored; `profilePictureVersion` in
 * `$lib/utils/profilePicture` is the one place that reads it.
 */
export type ProfilePicture = V2["schemas"]["ApiProfilePicture"];

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
 *
 * `parts` is the user's assigned parts, carried by both the collection and the
 * single-user read, ordered by the part's `sortOrder`. The API serves them as the
 * very same view model as the parts catalogue, so the v1 `Part` alias above types
 * them even though the rest of this shape is v2 — the v2 document leaves these
 * responses undefined, so it declares no part schema of its own to alias.
 *
 * `profilePicture` is the version of the picture the user has, or `null` for a
 * user with none — the collection carries it, so a list knows whose picture to
 * fetch without asking after every row. It is typed as the nested
 * `ApiProfilePicture` the upload endpoint answers with, the only shape the
 * document describes; every observed value so far has been `null`, so if it
 * turns out to be a bare version string this is the line to change (and
 * `profilePictureVersion` the only reader to follow).
 *
 * `lastLoginAt` is an ISO instant, `null` for a user who has never signed in. It
 * is the server's own record of the account and read-only here — never sent back
 * as part of an update.
 */
export interface User {
  id: string;
  name: string | null;
  email: string | null;
  inactive: boolean;
  roles?: string[] | null;
  parts?: Part[] | null;
  profilePicture?: ProfilePicture | null;
  lastLoginAt?: string | null;
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
 * the user this, rendered through `ui/SaveIndicator`. `error` outlives the other
 * states on purpose: there is no button left holding the user's attention, so a
 * write that didn't land has to keep saying so until the next attempt.
 */
export type SaveState = "idle" | "saving" | "saved" | "error";

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
