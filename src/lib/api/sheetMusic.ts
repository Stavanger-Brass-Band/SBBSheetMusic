import { createClient } from "./client";
import type {
  AssignCategoryRequest,
  Category,
  MusicSet,
  SetRequest,
} from "$lib/types";

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
      category?: string;
      top?: number;
      skip?: number;
    } = {},
  ) => {
    const params = new URLSearchParams();
    if (opts.search) params.set("$search", opts.search);
    // `category` is a plain filter alongside the OData options, and matches on
    // the category name.
    if (opts.category) params.set("category", opts.category);
    // $orderby takes comma separated "field [asc|desc]" clauses.
    params.set("$orderby", "archiveNumber desc");
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

  /** The categories currently assigned to a set. */
  listSetCategories: (setId: string) =>
    client.get<Category[]>(`/sheetmusic/sets/${setId}/categories`),

  /** Assigns a category; the response is the set's full category list. */
  assignCategory: (setId: string, categoryId: string) =>
    client.post<AssignCategoryRequest, Category[]>(
      `/sheetmusic/sets/${setId}/categories`,
      { categoryIdentifier: categoryId },
    ),

  removeCategory: (setId: string, categoryId: string) =>
    client.del(`/sheetmusic/sets/${setId}/categories/${categoryId}`),

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
