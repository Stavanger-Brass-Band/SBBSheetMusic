import { describe, expect, it } from "vitest";
import {
  flattenGroups,
  memberResults,
  pageResults,
  projectResults,
  quickJumpGroups,
  setResults,
  stepIndex,
} from "./quickJump";
import type { MusicSet, Musician, Project } from "$lib/types";

const READER = { canManageMusic: false, canReadLibrary: true };
const EDITOR = { canManageMusic: true, canReadLibrary: true };
const MUSIKANT = { canManageMusic: false, canReadLibrary: false };

const PAGES = [
  { id: "home", label: "Hjem", href: "/" },
  { id: "archive", label: "Arkivliste", href: "/archive" },
  { id: "roster", label: "Korpset", href: "/roster" },
];

describe("pageResults", () => {
  it("offers every destination when nothing has been typed", () => {
    expect(pageResults(PAGES, "").map((row) => row.label)).toEqual([
      "Hjem",
      "Arkivliste",
      "Korpset",
    ]);
  });

  it("filters by label, ignoring case", () => {
    expect(pageResults(PAGES, "ARKIV").map((row) => row.label)).toEqual([
      "Arkivliste",
    ]);
  });

  it("treats a query of only spaces as no query", () => {
    expect(pageResults(PAGES, "   ")).toHaveLength(3);
  });
});

describe("setResults", () => {
  const sets: MusicSet[] = [
    {
      id: "set-1",
      archiveNumber: 412,
      title: "Land of the Long White Cloud",
      composer: "Philip Sparke",
    },
    { id: "set-2", title: "Ave Maria", composer: "Bach", arranger: "Snell" },
  ];

  it("routes a library reader to the read-only view", () => {
    expect(setResults(sets, READER).map((row) => row.href)).toEqual([
      "/set/set-1",
      "/set/set-2",
    ]);
  });

  it("routes someone who may change the set to the editor", () => {
    expect(setResults(sets, EDITOR)[0].href).toBe("/set/edit/set-1");
  });

  /** With no expanded project there is no way for a Musikant into the set. */
  it("offers no sets to a Musikant when the projects weren't expanded", () => {
    expect(setResults(sets, MUSIKANT)).toEqual([]);
  });

  it("routes a Musikant through the project the set is on", () => {
    const onProject: MusicSet[] = [
      {
        id: "set-1",
        title: "Fanfare",
        projects: [{ id: "p-1", name: "17. mai" }],
      },
    ];

    expect(setResults(onProject, MUSIKANT)[0].href).toBe(
      "/project/p-1/set/set-1",
    );
  });

  it("drops a set on none of the projects a Musikant may see", () => {
    const orphaned: MusicSet[] = [
      { id: "set-1", title: "Fanfare", projects: [] },
      { id: "set-2", title: "Ave Maria", projects: null },
    ];

    expect(setResults(orphaned, MUSIKANT)).toEqual([]);
  });

  it("still opens the set directly for a reader who may, project or not", () => {
    const onProject: MusicSet[] = [
      {
        id: "set-1",
        title: "Fanfare",
        projects: [{ id: "p-1", name: "17. mai" }],
      },
    ];

    expect(setResults(onProject, READER)[0].href).toBe("/set/set-1");
    expect(setResults(onProject, EDITOR)[0].href).toBe("/set/edit/set-1");
  });

  it("names the composer, and the arranger when there is one", () => {
    const [first, second] = setResults(sets, READER);

    expect(first.detail).toBe("Philip Sparke");
    expect(second.detail).toBe("Bach · Arr. Snell");
  });

  it("carries the archive number as the row's figure", () => {
    expect(setResults(sets, READER)[0].meta).toBe("#412");
    expect(setResults(sets, READER)[1].meta).toBeUndefined();
  });

  it("stands in for a set the API sent no title for", () => {
    expect(setResults([{ id: "set-3" }], READER)[0].label).toBe("Uten tittel");
  });

  it("drops a set with no id, which nothing could be routed by", () => {
    expect(setResults([{ title: "Ingen id" }], READER)).toEqual([]);
  });
});

describe("projectResults", () => {
  it("leads to the member's view of the project", () => {
    const projects: Project[] = [{ id: "p-1", name: "Julekonsert" }];

    expect(projectResults(projects)[0].href).toBe("/project/p-1");
  });

  it("shows a date range only when the project has both ends of one", () => {
    const projects: Project[] = [
      {
        id: "p-1",
        name: "Julekonsert",
        startDate: "2026-12-01T12:00:00Z",
        endDate: "2026-12-20T12:00:00Z",
      },
      { id: "p-2", name: "Uten datoer" },
      { id: "p-3", name: "Halv", startDate: "2026-12-01T12:00:00Z" },
    ];
    const [full, none, half] = projectResults(projects);

    expect(full.meta).toBe("01.12.26–20.12.26");
    expect(none.meta).toBeUndefined();
    expect(half.meta).toBeUndefined();
  });
});

describe("memberResults", () => {
  const musicians: Musician[] = [
    {
      id: "m-1",
      name: "Kari Nordmann",
      roles: [],
      // The shape production actually serves: the instrument plus the numbered
      // chair the member sits in. The chair orders them; the instrument is what
      // gets printed.
      parts: [
        {
          id: "part-1",
          name: "Solokornett",
          instrumentGroup: "Kornett",
          sortOrder: 4,
        },
        {
          id: "part-2",
          name: "Solokornett 1-2",
          instrumentGroup: "Kornett",
          sortOrder: 4,
        },
      ],
    },
    {
      id: "m-2",
      name: "Ola Hansen",
      roles: [],
      parts: [{ id: "part-3", name: "Tuba 1", instrumentGroup: "Tuba" }],
    },
    // Assigned a stemme the catalogue has put in no instrument group, so Korpset
    // has no section to seat them in.
    {
      id: "m-3",
      name: "Kari Uten Gruppe",
      roles: [],
      parts: [{ id: "part-4", name: "Dirigent" }],
    },
  ];

  it("offers nobody until something has been typed", () => {
    expect(memberResults(musicians, "")).toEqual([]);
  });

  it("filters by name, ignoring case", () => {
    expect(memberResults(musicians, "ola").map((row) => row.label)).toEqual([
      "Ola Hansen",
    ]);
  });

  it("leaves out a member the roster can't seat", () => {
    expect(memberResults(musicians, "kari").map((row) => row.label)).toEqual([
      "Kari Nordmann",
    ]);
  });

  it("opens the member on the roster", () => {
    expect(memberResults(musicians, "ola")[0].href).toBe("/roster?member=m-2");
  });

  it("names the sections they play in, without repeating one", () => {
    expect(memberResults(musicians, "kari")[0].detail).toBe("Kornett");
  });

  it("carries the stemme that seats them as the row's figure", () => {
    expect(memberResults(musicians, "kari")[0].meta).toBe("Solokornett");
  });

  /**
   * The palette and the roster read a member the same way because they run the
   * same code — `rosterSections`. This is the case that would drift if they
   * didn't: a percussionist covering the kit prints the section, not one of the
   * eleven stemmer they hold.
   */
  it("prints the section for a member who covers several of its instruments", () => {
    const percussionist: Musician[] = [
      {
        id: "m-9",
        name: "Ulrik Rosenberg",
        roles: [],
        parts: [
          {
            id: "p-1",
            name: "Klokkespill",
            instrumentGroup: "Slagverk",
            sortOrder: 21,
          },
          {
            id: "p-2",
            name: "Timpani",
            instrumentGroup: "Slagverk",
            sortOrder: 21,
          },
          {
            id: "p-3",
            name: "Percussion 1",
            instrumentGroup: "Slagverk",
            sortOrder: 21,
          },
        ],
      },
    ];

    expect(memberResults(percussionist, "ulrik")[0].meta).toBe("Slagverk");
  });

  /**
   * The catalogue ranks `Solokornett` and `Solokornett 1-2` alike, so whichever
   * order the API listed the assignments in must not decide which one is printed
   * — the roster card settles it the same way, and the two have to agree. This is
   * the case that showed up on a real player: the row read "Solokornett 1-2"
   * where their card read "Solokornett".
   */
  it("prints the seating stemme, not whichever the API listed first", () => {
    const player: Musician[] = [
      {
        id: "m-9",
        name: "Leif Bjarte Johansson",
        roles: [],
        parts: [
          {
            id: "p-b",
            name: "Solokornett 1-2",
            instrumentGroup: "Kornett",
            sortOrder: 4,
          },
          {
            id: "p-a",
            name: "Solokornett",
            instrumentGroup: "Kornett",
            sortOrder: 4,
          },
        ],
      },
    ];

    expect(memberResults(player, "leif")[0].meta).toBe("Solokornett");
  });
});

describe("quickJumpGroups", () => {
  const row = (kind: "set" | "project" | "member" | "page", id: string) => ({
    id,
    kind,
    label: id,
    href: `/${id}`,
  });

  it("leads with the content and leaves the pages last", () => {
    const groups = quickJumpGroups({
      sets: [row("set", "s")],
      projects: [row("project", "p")],
      members: [row("member", "m")],
      pages: [row("page", "g")],
    });

    expect(groups.map((group) => group.kind)).toEqual([
      "set",
      "project",
      "member",
      "page",
    ]);
  });

  it("leaves out the groups that came back empty", () => {
    const groups = quickJumpGroups({
      sets: [],
      projects: [row("project", "p")],
      members: [],
      pages: [],
    });

    expect(groups.map((group) => group.heading)).toEqual(["Prosjekter"]);
  });

  it("marks only the groups the caller says came back full", () => {
    const groups = quickJumpGroups({
      sets: [row("set", "s")],
      projects: [row("project", "p")],
      members: [row("member", "m")],
      pages: [row("page", "g")],
      capped: ["set"],
    });

    expect(groups.map((group) => [group.kind, group.capped])).toEqual([
      ["set", true],
      ["project", false],
      ["member", false],
      ["page", false],
    ]);
  });

  /**
   * Mapping can drop rows — a set with no route for this reader — so a group that
   * looks short can still be one with more matches behind it.
   */
  it("marks a group capped even when its rows came out short", () => {
    const [group] = quickJumpGroups({
      sets: [row("set", "s")],
      projects: [],
      members: [],
      pages: [],
      capped: ["set"],
    });

    expect(group.results).toHaveLength(1);
    expect(group.capped).toBe(true);
  });

  it("marks nothing capped when the caller says nothing is", () => {
    const groups = quickJumpGroups({
      sets: [row("set", "s")],
      projects: [],
      members: [],
      pages: [],
    });

    expect(groups[0].capped).toBe(false);
  });

  it("flattens to the order the arrow keys walk", () => {
    const groups = quickJumpGroups({
      sets: [row("set", "s1"), row("set", "s2")],
      projects: [],
      members: [],
      pages: [row("page", "g")],
    });

    expect(flattenGroups(groups).map((r) => r.id)).toEqual(["s1", "s2", "g"]);
  });
});

describe("stepIndex", () => {
  it("moves through the list", () => {
    expect(stepIndex(0, 1, 3)).toBe(1);
    expect(stepIndex(2, -1, 3)).toBe(1);
  });

  it("wraps at both ends", () => {
    expect(stepIndex(2, 1, 3)).toBe(0);
    expect(stepIndex(0, -1, 3)).toBe(2);
  });

  it("stays put when there is nothing to walk", () => {
    expect(stepIndex(0, 1, 0)).toBe(0);
    expect(stepIndex(0, -1, 0)).toBe(0);
  });
});
