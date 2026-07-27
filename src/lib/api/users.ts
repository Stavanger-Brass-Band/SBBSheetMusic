import { createClient } from "./client";
import type {
  AssignRoleRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UpdateUserRequest,
  User,
  UserRequest,
} from "$lib/types";

const client = createClient("2.0");

export const users = {
  list: () => client.get<User[]>("/users"),

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
};
