import { createClient } from "./client";
import type { SquareCrop } from "$lib/utils/profilePicture";
import type {
  AssignPartsToUserRequest,
  AssignRoleRequest,
  ForgotPasswordRequest,
  PasswordRequirements,
  ProfilePicture,
  ResetPasswordRequest,
  UpdateUserRequest,
  User,
  UserRequest,
} from "$lib/types";

const client = createClient("2.0");

/**
 * How a profile-picture upload ended.
 *
 * The two refusals are worth telling apart from a plain failure because only the
 * reader can act on them, and differently: a picture over the server's ceiling
 * needs a smaller one, a file it cannot decode needs a different one. Neither
 * limit is documented — the endpoint declares no error responses at all — so
 * these are read off the status rather than from anything the spec promises.
 *
 * `version` is the picture's new version, and the only reason the endpoint
 * answers with a body: it is what tells a picture already in hand from the one
 * now stored. It stays nullable because a landed write with an unreadable body
 * is still a landed write — the caller can recover from a missing version (see
 * `profilePictures.replace`) but not from being told the upload failed.
 */
export type ProfilePictureUpload =
  | { status: "ok"; version: string | null }
  | { status: "tooLarge" }
  | { status: "invalidFile" }
  | { status: "failed" };

export const users = {
  /**
   * Every user, for the list page. Carries each user's roles and assigned parts
   * just as `get` does, so a list row can show them without a read per user.
   */
  list: () => client.get<User[]>("/users"),

  /**
   * A single user, including their assigned roles. Takes a guid or `"me"` for the
   * signed-in user; admins may read anyone, everyone else only themselves.
   */
  get: (id: string) => client.get<User>(`/users/${id}`),

  /** Creates a user. The endpoint returns 200 with no body. */
  create: (body: UserRequest) => client.postNoContent("/users/register", body),

  /**
   * Updates a user's name/email/password. Omit `password` to leave it
   * unchanged. The endpoint returns 200 with no body. Status and roles are
   * managed through the dedicated endpoints below.
   */
  update: (id: string, body: UpdateUserRequest) =>
    client.putNoContent(`/users/${id}`, body),

  /** Deletes a user — soft by default; `hardDelete` removes permanently. */
  remove: (id: string, hardDelete = false) =>
    client.del(`/users/${id}?hardDelete=${hardDelete}`),

  activate: (id: string) => client.putNoContent(`/users/${id}/activate`, {}),

  deactivate: (id: string) =>
    client.putNoContent(`/users/${id}/deactivate`, {}),

  assignRole: (id: string, roleName: string) =>
    client.putNoContent<AssignRoleRequest>(`/users/${id}/roles`, { roleName }),

  removeRole: (id: string, roleName: string) =>
    client.del(`/users/${id}/roles/${encodeURIComponent(roleName)}`),

  /**
   * Sets which parts the user plays, replacing whatever was assigned before —
   * there is no add or remove, so callers send the full list every time and an
   * empty one clears it. The API refuses duplicates and unknown part ids
   * outright, checking both before it writes, so a rejected call leaves the
   * previous assignment intact. Returns 200 with no body.
   */
  assignParts: (id: string, partIds: string[]) =>
    client.putNoContent<AssignPartsToUserRequest>(`/users/${id}/parts`, {
      partIds,
    }),

  /** Public: requests a password-reset email. Returns 200 with no body. */
  forgotPassword: (email: string) =>
    client.postNoContent<ForgotPasswordRequest>("/users/forgot-password", {
      email,
    }),

  /** Public: completes a reset using the emailed token. 200 with no body. */
  resetPassword: (body: ResetPasswordRequest) =>
    client.postNoContent("/users/reset-password", body),

  /**
   * A user's profile picture as image bytes — WebP, cropped and re-encoded by the
   * API. Any authenticated user may read anyone's.
   *
   * The endpoint wants the bearer token like every other one, so a picture cannot
   * be pointed at from an `<img src>` and has to be fetched and held as a blob.
   * The `profilePictures` store is what does that; nothing else should call this.
   * `version` rides along as an otherwise-ignored query param so the browser
   * caches each version under its own URL — without it a replaced picture can be
   * served from the HTTP cache as the bytes it used to be.
   *
   * `undefined` covers both a user with no picture and a read that failed. The
   * store treats them alike: either way all it can do is fall back to initials.
   */
  picture: (id: string, version: string) =>
    client.getBlob(
      `/users/${id}/profile-picture?v=${encodeURIComponent(version)}`,
    ),

  /**
   * Uploads or replaces a user's picture, cropped to `crop` by the API. A user
   * may set their own; an Admin may set anyone's.
   *
   * The field names are the spec's own (`File`, `X`, `Y`, `Size`) — .NET binds
   * them case-insensitively, so the casing is for the reader, not the server. The
   * crop is in the source image's own pixels; see `SquareCrop`.
   */
  setPicture: async (
    id: string,
    file: File,
    crop: SquareCrop,
  ): Promise<ProfilePictureUpload> => {
    const formData = new FormData();
    formData.append("File", file);
    formData.append("X", String(crop.x));
    formData.append("Y", String(crop.y));
    formData.append("Size", String(crop.size));

    const response = await client
      .putForm(`/users/${id}/profile-picture`, formData)
      .catch(() => null);

    if (!response) return { status: "failed" };
    if (response.status === 413) return { status: "tooLarge" };
    if (response.status === 400 || response.status === 415)
      return { status: "invalidFile" };
    if (!response.ok) return { status: "failed" };

    const picture = await response
      .json()
      .then((body) => body as ProfilePicture)
      .catch(() => null);
    return { status: "ok", version: picture?.version ?? null };
  },

  /** Removes a user's picture. A user may remove their own; an Admin anyone's. */
  removePicture: (id: string) => client.del(`/users/${id}/profile-picture`),

  /**
   * Public: the password policy enforced by register, update and reset. Reach
   * for the `passwordPolicy` store rather than this — it caches the result for
   * the session and every password form shares it.
   */
  passwordRequirements: () =>
    client.get<PasswordRequirements>("/users/password-requirements"),
};
