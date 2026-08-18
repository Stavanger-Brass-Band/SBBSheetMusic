import { describe, expect, it } from "vitest";
import type { Part, User } from "$lib/types";
import type { SortState } from "./listQuery";
import {
  DEFAULT_USER_SORT,
  NO_PARTS_FILTER,
  NO_ROLE_FILTER,
  applyUsersListView,
  readUsersListQuery,
  userInstrumentGroups,
  toUserStatusFilter,
  usersListHref,
  usersListQueryParams,
  type UsersListView,
} from "./usersListQuery";

function view(overrides: Partial<UsersListView> = {}): UsersListView {
  return {
    searchTerm: "",
    selectedRole: "",
    selectedGroup: "",
    selectedStatus: "",
    sort: DEFAULT_USER_SORT,
    ...overrides,
  };
}

let nextUserId = 0;
function user(overrides: Partial<User> = {}): User {
  nextUserId += 1;
  return {
    id: `user-${nextUserId}`,
    name: "Ola Nordmann",
    email: "ola@example.com",
    inactive: false,
    ...overrides,
  };
}

/**
 * A part as the users endpoint hands it over: an id and a name, and nothing
 * else — no group and no `sortOrder`. Everything the filters and the sort need
 * beyond that has to come out of the catalogue.
 */
const assignedPart = (id: string): Part => ({ id, name: id });

/**
 * The parts catalogue as `applyUsersListView` takes it: id → the part. The ranks
 * run in section order the way the real catalogue's do, and "Kornett 10" ranks
 * after "Kornett 2" while sorting before it by name.
 */
const catalogue = new Map<string, Part>(
  (
    [
      { id: "kornett-1", name: "Kornett 1", group: "Kornett", rank: 10 },
      { id: "kornett-2", name: "Kornett 2", group: "Kornett", rank: 20 },
      { id: "kornett-10", name: "Kornett 10", group: "Kornett", rank: 30 },
      {
        id: "horn-1",
        name: "Horn 1",
        group: "Horn og flygelhorn",
        rank: 40,
      },
      { id: "tuba-1", name: "Tuba 1", group: "Tuba", rank: 90 },
    ] as const
  ).map((entry) => [
    entry.id,
    {
      id: entry.id,
      name: entry.name,
      instrumentGroup: entry.group,
      sortOrder: entry.rank,
    },
  ]),
);

const apply = (users: User[], overrides: Partial<UsersListView> = {}) =>
  applyUsersListView(users, view(overrides), catalogue);

const names = (users: User[]) => users.map((entry) => entry.name);

describe("usersListQueryParams", () => {
  it("leaves an unfiltered, default-sorted list without params", () => {
    expect(usersListQueryParams(view())).toEqual([]);
  });

  it("carries the search term, trimmed and encoded", () => {
    expect(usersListQueryParams(view({ searchTerm: "  ola n  " }))).toEqual([
      "search=ola%20n",
    ]);
  });

  it("carries all three filters, encoding the values that need it", () => {
    expect(
      usersListQueryParams(
        view({
          selectedRole: "Noteansvarlig",
          selectedGroup: "Horn og flygelhorn",
          selectedStatus: "inactive",
        }),
      ),
    ).toEqual([
      "role=Noteansvarlig",
      "group=Horn%20og%20flygelhorn",
      "status=inactive",
    ]);
  });

  it("carries a sort that differs from the default", () => {
    expect(
      usersListQueryParams(
        view({ sort: { field: "role", direction: "desc" } }),
      ),
    ).toEqual(["sort=role", "dir=desc"]);
  });

  /** The default order needs no params — the plain list keeps a clean URL. */
  it("leaves the default sort out", () => {
    expect(
      usersListQueryParams(view({ sort: { field: "name", direction: "asc" } })),
    ).toEqual([]);
  });
});

describe("readUsersListQuery", () => {
  it("reads a view back out of the URL", () => {
    const params = new URLSearchParams(
      "search=ola&role=Admin&group=Tuba&status=active&sort=group&dir=desc",
    );
    expect(readUsersListQuery(params)).toEqual({
      searchTerm: "ola",
      selectedRole: "Admin",
      selectedGroup: "Tuba",
      selectedStatus: "active",
      sort: { field: "group", direction: "desc" },
    });
  });

  it("reads an empty URL as the unfiltered list in its default order", () => {
    expect(readUsersListQuery(new URLSearchParams())).toEqual(view());
  });

  it("keeps the sentinels, which are not role or group names", () => {
    const params = new URLSearchParams(
      `role=${NO_ROLE_FILTER}&group=${NO_PARTS_FILTER}`,
    );
    expect(readUsersListQuery(params)).toMatchObject({
      selectedRole: NO_ROLE_FILTER,
      selectedGroup: NO_PARTS_FILTER,
    });
  });

  /** Role names compare casefolded on the API, so the URL may too. */
  it("canonicalises a casefolded role to the spelling the chips use", () => {
    const params = new URLSearchParams("role=noteANSVARLIG");
    expect(readUsersListQuery(params).selectedRole).toBe("Noteansvarlig");
  });

  /**
   * A filter value that doesn't exist would match no user at all, so the page
   * would read as an empty list of members. Falling back to no filter shows it.
   */
  it("ignores filters the backend doesn't have", () => {
    const params = new URLSearchParams(
      "role=Dirigent&group=Blokkfløyte&status=retired",
    );
    expect(readUsersListQuery(params)).toMatchObject({
      selectedRole: "",
      selectedGroup: "",
      selectedStatus: "",
    });
  });

  it("ignores a sort field no column offers", () => {
    const params = new URLSearchParams("sort=password&dir=desc");
    expect(readUsersListQuery(params).sort).toEqual(DEFAULT_USER_SORT);
  });
});

describe("toUserStatusFilter", () => {
  it("keeps the two real statuses", () => {
    expect(toUserStatusFilter("active")).toBe("active");
    expect(toUserStatusFilter("inactive")).toBe("inactive");
  });

  it("reads anything else as no status filter", () => {
    expect(toUserStatusFilter("")).toBe("");
    expect(toUserStatusFilter(null)).toBe("");
    expect(toUserStatusFilter("Aktiv")).toBe("");
  });
});

describe("userInstrumentGroups", () => {
  it("names the sections a user's stemmer sit in, in catalogue order", () => {
    const player = user({
      parts: [assignedPart("tuba-1"), assignedPart("kornett-1")],
    });
    expect(userInstrumentGroups(player, catalogue)).toEqual([
      "Kornett",
      "Tuba",
    ]);
  });

  it("names a section once however many stemmer a user holds in it", () => {
    const player = user({
      parts: [assignedPart("kornett-1"), assignedPart("kornett-2")],
    });
    expect(userInstrumentGroups(player, catalogue)).toEqual(["Kornett"]);
  });

  it("has nothing to name for a user with no stemmer", () => {
    expect(userInstrumentGroups(user({ parts: [] }), catalogue)).toEqual([]);
    expect(userInstrumentGroups(user({ parts: null }), catalogue)).toEqual([]);
  });

  /** Without the catalogue behind it there is no group to name — see the store. */
  it("has nothing to name for a stemme the catalogue doesn't have", () => {
    const player = user({ parts: [assignedPart("ikke-i-katalogen")] });
    expect(userInstrumentGroups(player, catalogue)).toEqual([]);
  });
});

describe("applyUsersListView — filtering", () => {
  const users = [
    user({ name: "Admin Anne", email: "anne@sbb.no", roles: ["Admin"] }),
    user({
      name: "Bendik Bass",
      email: "bendik@sbb.no",
      roles: ["Musikant"],
      parts: [assignedPart("tuba-1")],
    }),
    user({ name: "Cecilie Kornett", email: "cecilie@sbb.no", roles: [] }),
    user({
      name: "Dag Dirigent",
      email: "dag@sbb.no",
      roles: ["Musikant", "Noteansvarlig"],
      parts: [assignedPart("kornett-1"), assignedPart("tuba-1")],
      inactive: true,
    }),
  ];

  it("keeps every user when nothing is filtered", () => {
    expect(apply(users)).toHaveLength(4);
  });

  it("matches the search on name", () => {
    expect(names(apply(users, { searchTerm: "bass" }))).toEqual([
      "Bendik Bass",
    ]);
  });

  it("matches the search on e-mail", () => {
    expect(names(apply(users, { searchTerm: "cecilie@" }))).toEqual([
      "Cecilie Kornett",
    ]);
  });

  it("keeps users holding the filtered role, however many others they hold", () => {
    expect(names(apply(users, { selectedRole: "Noteansvarlig" }))).toEqual([
      "Dag Dirigent",
    ]);
  });

  /** Roles add up rather than replacing each other, so both users match. */
  it("filters on a role held alongside others", () => {
    expect(names(apply(users, { selectedRole: "Musikant" }))).toEqual([
      "Bendik Bass",
      "Dag Dirigent",
    ]);
  });

  it("filters on holding no role at all", () => {
    expect(names(apply(users, { selectedRole: NO_ROLE_FILTER }))).toEqual([
      "Cecilie Kornett",
    ]);
  });

  it("treats a missing roles array as no roles", () => {
    const withoutRoles = [user({ name: "Uten roller", roles: null })];
    expect(apply(withoutRoles, { selectedRole: NO_ROLE_FILTER })).toHaveLength(
      1,
    );
  });

  it("filters on status", () => {
    expect(names(apply(users, { selectedStatus: "inactive" }))).toEqual([
      "Dag Dirigent",
    ]);
    expect(apply(users, { selectedStatus: "active" })).toHaveLength(3);
  });

  it("keeps users playing a part in the filtered group", () => {
    expect(names(apply(users, { selectedGroup: "Kornett" }))).toEqual([
      "Dag Dirigent",
    ]);
  });

  /** A user sits in every section they hold a stemme in, not just one. */
  it("matches a group the user plays alongside another", () => {
    expect(names(apply(users, { selectedGroup: "Tuba" }))).toEqual([
      "Bendik Bass",
      "Dag Dirigent",
    ]);
  });

  it("filters on having no stemmer assigned at all", () => {
    expect(names(apply(users, { selectedGroup: NO_PARTS_FILTER }))).toEqual([
      "Admin Anne",
      "Cecilie Kornett",
    ]);
  });

  /**
   * The group is read from the catalogue rather than from the user's own parts,
   * so a part the catalogue doesn't place in a group can't match one.
   */
  it("keeps a user whose part is missing from the catalogue out of every group", () => {
    const withUnknownPart = [
      user({
        name: "Ukjent stemme",
        parts: [assignedPart("ikke-i-katalogen")],
      }),
    ];
    expect(apply(withUnknownPart, { selectedGroup: "Kornett" })).toHaveLength(
      0,
    );
    // It is still an assigned stemme, so it is not "uten stemmer" either.
    expect(
      apply(withUnknownPart, { selectedGroup: NO_PARTS_FILTER }),
    ).toHaveLength(0);
  });

  it("narrows on every filter at once", () => {
    const narrowed = apply(users, {
      searchTerm: "dag",
      selectedRole: "Musikant",
      selectedGroup: "Kornett",
      selectedStatus: "inactive",
    });
    expect(names(narrowed)).toEqual(["Dag Dirigent"]);
  });

  it("leaves the caller's list untouched", () => {
    const original = [...users];
    apply(users, { sort: { field: "role", direction: "desc" } });
    expect(users).toEqual(original);
  });
});

describe("applyUsersListView — sorting", () => {
  const sortedBy = (users: User[], sort: SortState) =>
    names(apply(users, { sort }));

  it("sorts by name the Norwegian way, so æ ø å land after z", () => {
    const users = [
      user({ name: "Åse" }),
      user({ name: "Zakarias" }),
      user({ name: "Øyvind" }),
      user({ name: "Æsa" }),
    ];
    expect(sortedBy(users, { field: "name", direction: "asc" })).toEqual([
      "Zakarias",
      "Æsa",
      "Øyvind",
      "Åse",
    ]);
  });

  it("reverses on desc", () => {
    const users = [user({ name: "Berit" }), user({ name: "Anne" })];
    expect(sortedBy(users, { field: "name", direction: "desc" })).toEqual([
      "Berit",
      "Anne",
    ]);
  });

  /**
   * `ROLES` is ordered as widening access, so the widest role a user holds is
   * what places them — and holding none puts them ahead of every Musikant.
   */
  it("sorts by the widest role held, not by the first one listed", () => {
    const users = [
      user({ name: "Musikanten", roles: ["Musikant"] }),
      user({ name: "Administratoren", roles: ["Admin"] }),
      user({ name: "Uten rolle", roles: [] }),
      user({ name: "Noteansvarlige", roles: ["Musikant", "Noteansvarlig"] }),
    ];
    expect(sortedBy(users, { field: "role", direction: "asc" })).toEqual([
      "Uten rolle",
      "Musikanten",
      "Noteansvarlige",
      "Administratoren",
    ]);
  });

  /**
   * Sections come in the order `INSTRUMENT_GROUPS` has them, and inside a section
   * the catalogue rank decides — sorting either as text would put "Kornett 10"
   * ahead of "Kornett 2", and "Kornett" ahead of "Horn og flygelhorn".
   */
  it("sorts by the catalogue rank of the first stemme, not by its name", () => {
    const users = [
      user({ name: "Tubaisten", parts: [assignedPart("tuba-1")] }),
      user({ name: "Kornett tiende", parts: [assignedPart("kornett-10")] }),
      user({ name: "Kornett andre", parts: [assignedPart("kornett-2")] }),
    ];
    expect(sortedBy(users, { field: "group", direction: "asc" })).toEqual([
      "Kornett andre",
      "Kornett tiende",
      "Tubaisten",
    ]);
  });

  /** Several stemmer place a user by the first of them in catalogue order. */
  it("places a user by their highest-ranked stemme, however many they hold", () => {
    const users = [
      user({ name: "Bare tuba", parts: [assignedPart("tuba-1")] }),
      user({
        name: "Tuba og kornett",
        parts: [assignedPart("tuba-1"), assignedPart("kornett-1")],
      }),
    ];
    expect(sortedBy(users, { field: "group", direction: "asc" })).toEqual([
      "Tuba og kornett",
      "Bare tuba",
    ]);
  });

  it("sorts users with no stemme, or an unranked one, after everyone ranked", () => {
    const users = [
      user({ name: "Ingen stemmer", parts: [] }),
      user({
        name: "Ukjent stemme",
        parts: [assignedPart("ikke-i-katalogen")],
      }),
      user({ name: "Kornettisten", parts: [assignedPart("kornett-1")] }),
    ];
    expect(sortedBy(users, { field: "group", direction: "asc" })).toEqual([
      "Kornettisten",
      "Ingen stemmer",
      "Ukjent stemme",
    ]);
  });

  it("sorts sections in the catalogue's own order, not alphabetically", () => {
    const users = [
      user({ name: "Tubaisten", parts: [assignedPart("tuba-1")] }),
      user({ name: "Hornisten", parts: [assignedPart("horn-1")] }),
      user({ name: "Kornettisten", parts: [assignedPart("kornett-1")] }),
    ];
    expect(sortedBy(users, { field: "group", direction: "asc" })).toEqual([
      "Kornettisten",
      "Hornisten",
      "Tubaisten",
    ]);
  });

  it("sorts active users ahead of inactive ones", () => {
    const users = [
      user({ name: "Inaktiv", inactive: true }),
      user({ name: "Aktiv", inactive: false }),
    ];
    expect(sortedBy(users, { field: "status", direction: "asc" })).toEqual([
      "Aktiv",
      "Inaktiv",
    ]);
  });

  /**
   * The reader asked to reverse the column, not the names inside a tie — two
   * users with the same status still read as a name list either way.
   */
  it("keeps the name tie-break ascending in both directions", () => {
    const users = [
      user({ name: "Bodil", inactive: true }),
      user({ name: "Anne", inactive: true }),
      user({ name: "Dagny", inactive: false }),
      user({ name: "Cato", inactive: false }),
    ];
    expect(sortedBy(users, { field: "status", direction: "asc" })).toEqual([
      "Cato",
      "Dagny",
      "Anne",
      "Bodil",
    ]);
    expect(sortedBy(users, { field: "status", direction: "desc" })).toEqual([
      "Anne",
      "Bodil",
      "Cato",
      "Dagny",
    ]);
  });

  it("orders a user with no name at all rather than dropping them", () => {
    const users = [user({ name: "Anne" }), user({ name: null })];
    expect(sortedBy(users, { field: "name", direction: "asc" })).toEqual([
      null,
      "Anne",
    ]);
  });
});

describe("usersListHref", () => {
  it("returns the bare list when nothing was passed along", () => {
    expect(usersListHref(null)).toBe("/users");
    expect(usersListHref("")).toBe("/users");
  });

  it("rebuilds the view from the query it was handed", () => {
    expect(usersListHref("search=ola&group=Tuba&sort=role&dir=desc")).toBe(
      "/users?search=ola&group=Tuba&sort=role&dir=desc",
    );
  });

  it("tolerates a leading question mark", () => {
    expect(usersListHref("?status=inactive")).toBe("/users?status=inactive");
  });

  /** The value is only ever a query string, so it cannot send the reader elsewhere. */
  it("cannot be used to point at another path", () => {
    expect(usersListHref("//example.com")).toBe("/users?//example.com");
    expect(usersListHref("/anywhere")).toBe("/users?/anywhere");
  });
});
