import { createClient } from "./client";
import type { Part, PartRequest } from "$lib/types";

const client = createClient("1.0");

export const parts = {
  list: () => client.get<Part[]>("/parts"),

  /** Suggests a matching part for a file based on its name. */
  suggest: (searchTerm: string) =>
    client.get<Part>(
      `/parts/index?searchTerm=${encodeURIComponent(searchTerm)}`,
    ),

  create: (body: PartRequest) => client.post<PartRequest, Part>("/parts", body),

  update: (id: string, body: PartRequest) =>
    client.put<PartRequest, Part>(`/parts/${id}`, body),

  remove: (id: string) => client.del(`/parts/${id}`),

  // Aliases are managed through their own endpoints; the alias travels as a
  // query param (add) or path segment (remove), so both must be encoded.
  addAlias: (id: string, alias: string) =>
    client.post<Record<string, never>, Part>(
      `/parts/${id}/aliases?alias=${encodeURIComponent(alias)}`,
      {},
    ),

  removeAlias: (id: string, alias: string) =>
    client.del(`/parts/${id}/aliases/${encodeURIComponent(alias)}`),
};
