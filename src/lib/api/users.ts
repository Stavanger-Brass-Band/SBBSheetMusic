import { createClient } from "./client";
import type {
  AssignRoleRequest,
  ForgotPasswordRequest,
  PasswordRequirements,
  ResetPasswordRequest,
  UpdateUserRequest,
  User,
  UserRequest,
} from "$lib/types";

const client = createClient("2.0");

export const users = {
  /**
   * Every user, for the list page. Note the response carries no roles — only
   * `get` is documented to include them, so anything that needs a user's roles
   * has to fetch that user.
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

  /** Public: requests a password-reset email. Returns 200 with no body. */
  forgotPassword: (email: string) =>
    client.postNoContent<ForgotPasswordRequest>("/users/forgot-password", {
      email,
    }),

  /** Public: completes a reset using the emailed token. 200 with no body. */
  resetPassword: (body: ResetPasswordRequest) =>
    client.postNoContent("/users/reset-password", body),

  /**
   * Public: the password policy enforced by register, update and reset. Reach
   * for the `passwordPolicy` store rather than this — it caches the result for
   * the session and every password form shares it.
   */
  passwordRequirements: () =>
    client.get<PasswordRequirements>("/users/password-requirements"),
};
