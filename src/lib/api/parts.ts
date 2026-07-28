import { createClient } from "./client";
import type { Part, PartRequest } from "$lib/types";

const client = createClient("1.0");

export const parts = {
  // Aliases are a related collection the collection endpoint omits by default —
  // without `$expand=aliases` every part comes back with them missing.
  list: () => client.get<Part[]>("/parts?$expand=aliases"),

  /**
   * Single part by id (the endpoint also accepts a name or alias). Unlike the
   * collection, this response carries the part's aliases without `$expand` —
   * the endpoint takes no OData options.
   */
  get: (id: string) => client.get<Part>(`/parts/${id}`),

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
  // query param (add) or path segment (remove), so both must be encoded. Both
  // return the raw Response so callers can check `ok` — the endpoints answer
  // with the updated part, but callers apply the change locally instead, so an
  // empty body must not be able to throw.
  addAlias: (id: string, alias: string) =>
    client.postNoContent(
      `/parts/${id}/aliases?alias=${encodeURIComponent(alias)}`,
      {},
    ),

  removeAlias: (id: string, alias: string) =>
    client.del(`/parts/${id}/aliases/${encodeURIComponent(alias)}`),
};
