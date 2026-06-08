import { createClient } from "./client";
import type { Part } from "$lib/types";

const client = createClient("1.0");

export const parts = {
  list: () => client.get<Part[]>("/parts"),

  /** Suggests a matching part for a file based on its name. */
  suggest: (searchTerm: string) =>
    client.get<Part>(
      `/parts/index?searchTerm=${encodeURIComponent(searchTerm)}`,
    ),
};
