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
   * Server-side searched, sorted and paged set list using the v2 OData query
   * options ($search / $orderby / $top / $skip). Returns one page of results
   * (the endpoint has no total-count envelope, so callers infer "has more" from
   * a full page).
   */
  searchSets: (
    opts: {
      search?: string;
      category?: string;
      orderBy?: string;
      top?: number;
      skip?: number;
    } = {},
  ) => {
    const params = new URLSearchParams();
    if (opts.search) params.set("$search", opts.search);
    // `category` is a plain filter alongside the OData options, and matches on
    // the category name.
    if (opts.category) params.set("category", opts.category);
    // $orderby takes comma separated "field [asc|desc]" clauses. Newest archive
    // number first unless the caller sorts the list itself.
    params.set("$orderby", opts.orderBy ?? "archiveNumber desc");
    params.set("$top", String(opts.top ?? 30));
    params.set("$skip", String(opts.skip ?? 0));
    return client.get<MusicSet[]>(`/sheetmusic/sets?${params}`);
  },

  /**
   * Returns the set including its parts. Role-scoped: a set outside what the
   * user's roles reach is refused rather than returned, so callers get a
   * `CatalogResult` and say "no access" apart from "couldn't load".
   */
  getSetWithParts: (id: string) =>
    client.getCatalog<MusicSet>(`/sheetmusic/sets/${id}/parts`),

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

  /**
   * A one-time token authorising one download of this set. Issued only for a set
   * the user's roles reach, so it is the point where a download is refused —
   * hence the `CatalogResult`. The token is bound to the set and consumed by the
   * first download that presents it; each download needs its own.
   */
  getZipToken: (id: string) =>
    client.getCatalogText(`/sheetmusic/sets/${id}/zip/token`),

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
