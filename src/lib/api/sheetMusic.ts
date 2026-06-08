import { createClient } from "./client";
import type { MusicSet, SetRequest } from "$lib/types";

const client = createClient("2.0");

export const sheetMusic = {
  listSets: () => client.get<MusicSet[]>("/sheetmusic/sets"),

  /**
   * Server-side paged + searched set list using the v2 OData query options
   * ($search / $top / $skip). Returns one page of results (the endpoint has no
   * total-count envelope, so callers infer "has more" from a full page).
   */
  searchSets: (
    opts: {
      search?: string;
      top?: number;
      skip?: number;
      /** OData order: field + direction (0 = ascending, 1 = descending). */
      orderBy?: { field: string; direction: 0 | 1 }[];
    } = {},
  ) => {
    const params = new URLSearchParams();
    if (opts.search) params.set("$search", opts.search);
    // The ODataQueryParams object binds from the query string; $orderBy is an
    // array of { field, direction } → indexed form $orderBy[i].field / .direction.
    (opts.orderBy ?? []).forEach((o, i) => {
      params.set(`$orderBy[${i}].field`, o.field);
      params.set(`$orderBy[${i}].direction`, String(o.direction));
    });
    params.set("$top", String(opts.top ?? 30));
    params.set("$skip", String(opts.skip ?? 0));
    return client.get<MusicSet[]>(`/sheetmusic/sets?${params}`);
  },

  /** Returns the set including its parts. */
  getSetWithParts: (id: string) =>
    client.get<MusicSet>(`/sheetmusic/sets/${id}/parts`),

  createSet: (body: SetRequest) =>
    client.post<SetRequest, MusicSet>("/sheetmusic/sets", body),

  updateSet: (id: string, body: SetRequest) =>
    client.put<SetRequest, MusicSet>(`/sheetmusic/sets/${id}`, body),

  deleteSet: (id: string) => client.del(`/sheetmusic/sets/${id}`),

  deletePart: (setId: string, partId: string) =>
    client.del(`/sheetmusic/sets/${setId}/parts/${partId}`),

  getZipToken: (id: string) =>
    client.getText(`/sheetmusic/sets/${id}/zip/token`),

  getPartPdf: (setId: string, partName: string, downloadToken: string) =>
    client.getBlob(
      `/sheetmusic/sets/${setId}/parts/${encodeURIComponent(partName)}/pdf?downloadToken=${downloadToken}`,
    ),

  uploadPartContent: (setId: string, partName: string, file: File) =>
    client.postFile(
      `/sheetmusic/sets/${setId}/parts/${encodeURIComponent(partName)}/content`,
      file,
    ),
};
