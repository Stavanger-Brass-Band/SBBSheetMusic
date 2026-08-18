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
import {
  INSTRUMENT_GROUPS,
  type InstrumentGroup,
  type Part,
  type User,
} from "$lib/types";
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
 * `readSortParams` checks a URL against. `role` and `group` order the two
 * multi-value columns by what can be ordered at all: how wide the user's access
 * reaches, and which section they sit in.
 */
export const USER_SORTABLE_FIELDS = [
  "name",
  "role",
  "group",
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
 * `partsById` is the parts catalogue keyed by id. Both the instrument group and
 * the catalogue rank have to be looked up there rather than read off
 * `user.parts`: the users endpoint has no schema in the OpenAPI document and
 * nothing says which of a part's fields it fills in, so the only field the app
 * can rely on there is the id it already assigns parts by.
 */
/**
 * The sections a user sits in: the instrument groups of the stemmer they are
 * assigned, without repeats and in the catalogue's own section order.
 *
 * This is what the Brukere list shows in place of the individual stemmer, what
 * it sorts that column by, and what the group filter matches — so all three
 * agree by construction. Read from the catalogue for the reason
 * `applyUsersListView` gives.
 */
export function userInstrumentGroups(
  user: User,
  partsById: ReadonlyMap<string, Part>,
): string[] {
  const groups = new Set<InstrumentGroup>(
    (user.parts ?? [])
      .map((part) =>
        part.id ? partsById.get(part.id)?.instrumentGroup : undefined,
      )
      .filter((group): group is InstrumentGroup => !!group),
  );
  return INSTRUMENT_GROUPS.filter((group) => groups.has(group));
}

export function applyUsersListView(
  users: User[],
  view: UsersListView,
  partsById: ReadonlyMap<string, Part>,
): User[] {
  return users
    .filter((user) => matchesFilters(user, view, partsById))
    .sort((a, b) => compareUsers(a, b, view.sort, partsById));
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
  partsById: ReadonlyMap<string, Part>,
): boolean {
  if (view.selectedStatus === "active" && user.inactive) return false;
  if (view.selectedStatus === "inactive" && !user.inactive) return false;

  const parts = user.parts ?? [];
  if (view.selectedGroup === NO_PARTS_FILTER) {
    if (parts.length) return false;
  } else if (
    view.selectedGroup &&
    !userInstrumentGroups(user, partsById).includes(view.selectedGroup)
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

function compareUsers(
  a: User,
  b: User,
  sort: SortState,
  partsById: ReadonlyMap<string, Part>,
): number {
  const primary = compareBySortField(a, b, sort.field, partsById);
  if (primary !== 0) return sort.direction === "asc" ? primary : -primary;
  // The tie-break stays ascending whichever way the column is sorted: the
  // reader asked to reverse the column, not the names inside a tie.
  return compareText(a.name, b.name) || compareText(a.email, b.email);
}

function compareBySortField(
  a: User,
  b: User,
  field: string,
  partsById: ReadonlyMap<string, Part>,
): number {
  switch (field) {
    case "role":
      return widestRoleRank(a) - widestRoleRank(b);
    case "group":
      // The section places a user, and their first stemme places them inside it:
      // ordering by rank alone would read as unsorted if the catalogue's own
      // ranks ever stopped running section by section, and ordering by section
      // alone would leave a whole cornet row in name order rather than by seat.
      return (
        compareRank(sectionRank(a, partsById), sectionRank(b, partsById)) ||
        compareRank(firstPartRank(a, partsById), firstPartRank(b, partsById))
      );
    case "status":
      return Number(a.inactive) - Number(b.inactive);
    default:
      return compareText(a.name, b.name);
  }
}

/**
 * Which section a user sits in, as an index into `INSTRUMENT_GROUPS` — that list
 * is in the standard brass band section order, so the index is the order the
 * sections belong in. A user in more than one sits with the first of them.
 */
function sectionRank(user: User, partsById: ReadonlyMap<string, Part>): number {
  const [first] = userInstrumentGroups(user, partsById);
  const index = INSTRUMENT_GROUPS.findIndex((group) => group === first);
  return index === -1 ? Infinity : index;
}

/**
 * Where a user's stemmer place them inside their section: the catalogue rank of
 * the first of them in catalogue order. Ranking rather than comparing names is
 * what makes a section read as it is seated — `Kornett 2` before `Kornett 10` —
 * since the catalogue's `sortOrder` is what that order is kept in (see
 * `byCatalogOrder`).
 *
 * A user with no stemme, or with one the catalogue has no rank for, has no rank
 * at all and sorts after everyone who does while ascending.
 */
function firstPartRank(
  user: User,
  partsById: ReadonlyMap<string, Part>,
): number {
  const ranks = (user.parts ?? [])
    .map((part) => (part.id ? partsById.get(part.id)?.sortOrder : undefined))
    .filter((sortOrder): sortOrder is number => sortOrder !== undefined);
  return ranks.length ? Math.min(...ranks) : Infinity;
}

/** Compared rather than subtracted, since two unranked users would give `NaN`. */
function compareRank(a: number, b: number): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
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
