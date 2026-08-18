/**
 * The Brukere list's view — the search term, the role and status filters, and
 * the column it is sorted by — as URL params, plus the filtering and sorting
 * themselves.
 *
 * All of it runs client-side. Unlike the sets, projects and parts collections,
 * `GET /users` takes no OData options at all — only `api-version` — so there is
 * no `$filter` or `$orderby` to hand the work to, and the endpoint answers with
 * every user in one call regardless. The view belongs in the URL all the same,
 * so opening a user and coming back lands on the list the reader left rather
 * than on the unfiltered one. The editor is handed the same query string to
 * build its way back with, which is why reading, writing and applying a view
 * live together here.
 */

import { ROLES, holdsRole } from "$lib/roles";
import { INSTRUMENT_GROUPS, type User } from "$lib/types";
import {
  isSameSort,
  listHrefWithQuery,
  readSortParams,
  type SortState,
} from "./listQuery";

/** The filter value standing for "users holding no role at all". */
export const NO_ROLE_FILTER = "none";

/**
 * The group filter's value standing for "users with no stemme assigned at all".
 *
 * It is deliberately not the parts catalogue's "uten gruppe": a part without an
 * instrument group is a one-off rather than a seat in a section, so the users it
 * happens to be assigned to are not a group anyone looks for. Who has yet to be
 * given any stemme is, so that is what the slot answers.
 */
export const NO_PARTS_FILTER = "none";

/**
 * The columns the list sorts on — one per column the table shows, and the guard
 * `readSortParams` checks a URL against. `role` and `parts` order the two
 * multi-value columns by the only thing that can be ordered: how wide the
 * user's access reaches, and how many stemmer they are assigned.
 */
export const USER_SORTABLE_FIELDS = [
  "name",
  "role",
  "parts",
  "status",
] as const;

/** The order the list opens in — by name, as it always has. */
export const DEFAULT_USER_SORT: SortState = { field: "name", direction: "asc" };

/** Which users the status filter keeps; `""` keeps all of them. */
export type UserStatusFilter = "" | "active" | "inactive";

export interface UsersListView {
  searchTerm: string;
  /** A role name from `ROLES`, `NO_ROLE_FILTER`, or `""` for every role. */
  selectedRole: string;
  /**
   * An instrument group from `INSTRUMENT_GROUPS`, `NO_PARTS_FILTER`, or `""` for
   * every group.
   */
  selectedGroup: string;
  selectedStatus: UserStatusFilter;
  sort: SortState;
}

/** The `key=value` pairs a view consists of, ready for `replaceListUrl`. */
export function usersListQueryParams(view: UsersListView): string[] {
  const params: string[] = [];
  const query = view.searchTerm.trim();
  if (query) params.push(`search=${encodeURIComponent(query)}`);
  if (view.selectedRole)
    params.push(`role=${encodeURIComponent(view.selectedRole)}`);
  if (view.selectedGroup)
    params.push(`group=${encodeURIComponent(view.selectedGroup)}`);
  if (view.selectedStatus) params.push(`status=${view.selectedStatus}`);
  // The sort is left out while it matches the default, so the plain list keeps
  // a clean URL.
  if (!isSameSort(view.sort, DEFAULT_USER_SORT))
    params.push(`sort=${view.sort.field}`, `dir=${view.sort.direction}`);
  return params;
}

/**
 * The view a URL describes. Every filter is checked against what exists, so a
 * stale or hand-edited link can only narrow the list to something real — an
 * unknown value would otherwise filter every user away and read as an empty
 * list of members.
 */
export function readUsersListQuery(params: URLSearchParams): UsersListView {
  return {
    searchTerm: params.get("search") ?? "",
    selectedRole: readRoleFilter(params.get("role")),
    selectedGroup: readGroupFilter(params.get("group")),
    selectedStatus: toUserStatusFilter(params.get("status")),
    sort: readSortParams(params, USER_SORTABLE_FIELDS, DEFAULT_USER_SORT),
  };
}

/**
 * Where the user editor's way back goes: the list as the reader left it, from
 * the query string it was handed in `from`.
 */
export function usersListHref(from: string | null): string {
  return listHrefWithQuery("/users", from);
}

/**
 * The rows a view leaves on screen, in the order it puts them. Filters first,
 * then sorts what survives — `filter` hands over a fresh array, so the caller's
 * list is never reordered under it.
 *
 * `groupByPartId` maps a part id to its instrument group. The group has to be
 * looked up rather than read off `user.parts`: the users endpoint has no schema
 * in the OpenAPI document and nothing says which of a part's fields it fills in,
 * so the only field the app can rely on there is the id it already assigns parts
 * by. The caller reads the groups from the parts catalogue instead.
 */
export function applyUsersListView(
  users: User[],
  view: UsersListView,
  groupByPartId: ReadonlyMap<string, string>,
): User[] {
  return users
    .filter((user) => matchesFilters(user, view, groupByPartId))
    .sort((a, b) => compareUsers(a, b, view.sort));
}

/**
 * A role name matched the way the API compares them — casefolded — and given
 * back in the spelling `ROLES` uses, since that is what the filter chips
 * compare against. Anything else reads as no role filter at all.
 */
function readRoleFilter(value: string | null): string {
  if (!value) return "";
  if (value.toLowerCase() === NO_ROLE_FILTER) return NO_ROLE_FILTER;
  return ROLES.find((role) => role.toLowerCase() === value.toLowerCase()) ?? "";
}

/**
 * A status filter read out of something untyped — a URL param or the value of
 * the filter's own `select`. Anything unrecognised means no status filter.
 */
export function toUserStatusFilter(value: string | null): UserStatusFilter {
  return value === "active" || value === "inactive" ? value : "";
}

/**
 * An instrument group matched against the ones the backend defines, so a stale
 * or hand-edited link can only narrow the list to a real section.
 */
function readGroupFilter(value: string | null): string {
  if (!value) return "";
  if (value === NO_PARTS_FILTER) return NO_PARTS_FILTER;
  return INSTRUMENT_GROUPS.find((group) => group === value) ?? "";
}

function matchesFilters(
  user: User,
  view: UsersListView,
  groupByPartId: ReadonlyMap<string, string>,
): boolean {
  if (view.selectedStatus === "active" && user.inactive) return false;
  if (view.selectedStatus === "inactive" && !user.inactive) return false;

  const parts = user.parts ?? [];
  if (view.selectedGroup === NO_PARTS_FILTER) {
    if (parts.length) return false;
  } else if (
    view.selectedGroup &&
    !parts.some(
      (part) => !!part.id && groupByPartId.get(part.id) === view.selectedGroup,
    )
  ) {
    return false;
  }

  const roles = user.roles ?? [];
  if (view.selectedRole === NO_ROLE_FILTER) {
    if (roles.length) return false;
  } else if (view.selectedRole && !holdsRole(roles, view.selectedRole)) {
    return false;
  }

  const query = view.searchTerm.trim().toLowerCase();
  if (!query) return true;
  return (
    (user.name ?? "").toLowerCase().includes(query) ||
    (user.email ?? "").toLowerCase().includes(query)
  );
}

function compareUsers(a: User, b: User, sort: SortState): number {
  const primary = compareBySortField(a, b, sort.field);
  if (primary !== 0) return sort.direction === "asc" ? primary : -primary;
  // The tie-break stays ascending whichever way the column is sorted: the
  // reader asked to reverse the column, not the names inside a tie.
  return compareText(a.name, b.name) || compareText(a.email, b.email);
}

function compareBySortField(a: User, b: User, field: string): number {
  switch (field) {
    case "role":
      return widestRoleRank(a) - widestRoleRank(b);
    case "parts":
      return (a.parts?.length ?? 0) - (b.parts?.length ?? 0);
    case "status":
      return Number(a.inactive) - Number(b.inactive);
    default:
      return compareText(a.name, b.name);
  }
}

const compareText = (a: string | null, b: string | null): number =>
  (a ?? "").localeCompare(b ?? "", "nb-NO");

/**
 * How far a user's access reaches, as an index into `ROLES` — that list is
 * ordered as widening access, so the widest role held is the one worth sorting
 * on, the same reading `primaryRoleLabel` gives the account menu. A user
 * holding no role at all sorts ahead of every `Musikant`.
 */
function widestRoleRank(user: User): number {
  const roles = user.roles ?? [];
  return ROLES.findLastIndex((role) => holdsRole(roles, role));
}
