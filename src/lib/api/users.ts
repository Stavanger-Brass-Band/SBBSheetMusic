import { createClient } from "./client";
import type { UpdateUserRequest, User, UserRequest } from "$lib/types";

const client = createClient("1.0");

export const users = {
  list: () => client.get<User[]>("/users"),

  /** Creates a user. The endpoint returns 200 with no body. */
  create: (body: UserRequest) => client.postNoContent("/users/register", body),

  /**
   * Updates a user. Omit `password` to leave it unchanged. The endpoint
   * returns 200 with no body.
   */
  update: (id: string, body: UpdateUserRequest) =>
    client.putNoContent(`/users/${id}`, body),
};
