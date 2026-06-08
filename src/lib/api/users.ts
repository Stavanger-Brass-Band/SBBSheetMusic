import { createClient } from "./client";
import type { User } from "$lib/types";

const client = createClient("1.0");

export const users = {
  list: () => client.get<User[]>("/users"),
};
