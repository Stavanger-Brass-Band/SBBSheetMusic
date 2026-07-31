/**
 * Shared query state for the OData-backed list pages (Arkivliste, Prosjekter):
 * how far the list has been paged and which column it is sorted by. Both live
 * in the URL, so leaving a list and coming back — or reloading, or sharing the
 * link — lands on the same view.
 *
 * The page size is fixed rather than something the reader picks: the archive is
 * near 2000 sets, so a page deep enough to be worth reading is more useful than
 * a control for choosing one.
 */

import { goto } from "$app/navigation";

/** Rows fetched per request, for the first page and every "load more" after. */
export const PAGE_SIZE = 100;

/**
 * Pages a restore from the URL may ask for, since it becomes one request. It
 * keeps a bookmarked deep-paged list from coming back as a request for
 * thousands of rows.
 */
const MAX_RESTORED_PAGES = 6;

/** How many pages the URL asks for, clamped to what one request can serve. */
export function parsePagesParam(value: string | null): number {
  const pages = Math.trunc(Number(value));
  if (!Number.isFinite(pages) || pages < 1) return 1;
  return Math.min(pages, MAX_RESTORED_PAGES);
}

export type SortDirection = "asc" | "desc";

export interface SortState {
  field: string;
  direction: SortDirection;
}

/** The OData `$orderby` clause for a sort state. */
export function toOrderByClause(sort: SortState): string {
  return `${sort.field} ${sort.direction}`;
}

export function isSameSort(a: SortState, b: SortState): boolean {
  return a.field === b.field && a.direction === b.direction;
}

/**
 * Where a header click lands: the column already sorted on flips direction,
 * any other column starts ascending.
 */
export function toggleSort(current: SortState, field: string): SortState {
  if (current.field !== field) return { field, direction: "asc" };
  return { field, direction: current.direction === "asc" ? "desc" : "asc" };
}

/**
 * The sort a URL describes, or `defaultSort` when it names none. The field goes
 * straight into an OData `$orderby`, so `sortableFields` guards it — a stale or
 * hand-edited link must not be able to ask the API to sort on a column that
 * isn't there.
 */
export function readSortParams(
  params: URLSearchParams,
  sortableFields: readonly string[],
  defaultSort: SortState,
): SortState {
  const field = params.get("sort");
  if (!field || !sortableFields.includes(field)) return defaultSort;
  return { field, direction: params.get("dir") === "desc" ? "desc" : "asc" };
}

/**
 * Writes a view back into the URL, replacing the current history entry so
 * searching, sorting and paging never fill the back stack. `params` is the
 * already-encoded `key=value` pairs the view consists of; an empty list falls
 * back to `pathname`, leaving the bare list URL.
 *
 * This has to be a real navigation and **not** `replaceState`: shallow routing
 * parks the pre-call URL in the history entry (`sveltekit:pageurl`) and
 * restores that one on a back navigation, so coming back from a set would show
 * the params in the address bar while the page rebuilt itself from an empty
 * query. `replaceState` doesn't update `page.url` either, so the params would be
 * invisible to the page that just wrote them. `noScroll` and `keepFocus` keep
 * this in-place update from jumping to the top of the list or dropping focus
 * while the reader is still typing in the search field.
 */
export function replaceListUrl(params: string[], pathname: string): void {
  void goto(params.length ? `?${params.join("&")}` : pathname, {
    replaceState: true,
    noScroll: true,
    keepFocus: true,
  });
}
