/**
 * The Stemmekatalog list's view as URL params: the search term and the
 * instrument-group filter.
 *
 * Both filters run client-side — the parts endpoint answers with the whole
 * catalogue in one call — but they belong in the URL anyway, so opening a part
 * and coming back lands on the list the reader left rather than on the
 * unfiltered catalogue. The editor is handed the same query string to build its
 * way back with, which is why reading and writing it live together here.
 */

import { listHrefWithQuery } from "./listQuery";

/**
 * The filter value standing for "parts with no instrument group at all". A real
 * group name can't collide with it: the backend's `InstrumentGroup` values are
 * the six section names, and this is not one of them.
 */
export const NO_GROUP_FILTER = "none";

/** The `key=value` pairs a view consists of, ready for `replaceListUrl`. */
export function partsListQueryParams(
  searchTerm: string,
  selectedGroup: string,
): string[] {
  const params: string[] = [];
  const query = searchTerm.trim();
  if (query) params.push(`search=${encodeURIComponent(query)}`);
  if (selectedGroup) params.push(`group=${encodeURIComponent(selectedGroup)}`);
  return params;
}

/**
 * The view a URL describes. `group` is checked against the groups that exist,
 * so a stale or hand-edited link can only ever narrow the list to something
 * real — an unknown value would otherwise filter every part away and read as an
 * empty catalogue.
 */
export function readPartsListQuery(
  params: URLSearchParams,
  groups: readonly string[],
): { searchTerm: string; selectedGroup: string } {
  const group = params.get("group") ?? "";
  const isKnownGroup = group === NO_GROUP_FILTER || groups.includes(group);
  return {
    searchTerm: params.get("search") ?? "",
    selectedGroup: isKnownGroup ? group : "",
  };
}

/**
 * Where the part editor's way back goes: the list as the reader left it, from
 * the query string it passed along in `from`.
 */
export function partsListHref(from: string | null): string {
  return listHrefWithQuery("/parts", from);
}
