/**
 * Quick jump's result model: the pure half of the palette.
 *
 * Everything here turns what the API sent into rows, so the component is left
 * with the overlay, the keystrokes and the requests. The rows are deliberately
 * one flat shape whatever they came from — a set, a project, a member, a page —
 * because the keyboard walks them as one list regardless of the group headings
 * they are drawn under.
 */

import type { NavItem } from "$lib/navigation";
import type { MusicSet, Musician, Project } from "$lib/types";
import { formatDmyShort } from "./date";
import { rosterSections } from "./roster";
import { setRouteFor, type SetRouteCapabilities } from "./setRoute";

/** What a row stands for. Decides its group, its heading and its icon. */
export type QuickJumpKind = "set" | "project" | "member" | "page";

export interface QuickJumpResult {
  /**
   * Unique across the whole list, not just its group — it is the element id
   * `aria-activedescendant` points the screen reader at. Prefixed by kind so a
   * set and a project can't collide on a shared guid.
   */
  id: string;
  kind: QuickJumpKind;
  label: string;
  /** The line under the label: a composer, a section — whatever names the row. */
  detail?: string;
  /** The mono figure on the right: an archive number, a date range. */
  meta?: string;
  href: string;
}

export interface QuickJumpGroup {
  kind: QuickJumpKind;
  heading: string;
  results: QuickJumpResult[];
  /**
   * The API had at least as many matches as were asked for, so there are more
   * than these. Only the server-searched groups can be capped; the members and
   * the pages are filtered from complete lists and are always all of them.
   */
  capped: boolean;
}

/**
 * Rows per group, and what the sets and projects searches ask the API for — so a
 * group is capped before it is fetched, not after.
 *
 * It was 5, which turned out to be too few to be honest about: a query with more
 * matches than this drops the rest, and a reader who doesn't find a set they know
 * exists concludes it isn't there. Two things answer that — this is generous
 * enough that an ordinary title search fits inside it, and a group that fills it
 * says so (`capped` below).
 */
export const QUICK_JUMP_GROUP_LIMIT = 8;

/** Case-insensitive contains, for the two lists filtered on the client. */
function matches(haystack: string | null | undefined, needle: string): boolean {
  return (haystack ?? "").toLowerCase().includes(needle);
}

/**
 * The navigation destinations, filtered by label. These are the palette's
 * standing answer: with nothing typed they are the whole list, which is what
 * makes ⌘K a way of getting around and not only a way of searching.
 */
export function pageResults(
  items: NavItem[],
  query: string,
): QuickJumpResult[] {
  const needle = query.trim().toLowerCase();
  return items
    .filter((item) => !needle || matches(item.label, needle))
    .map((item) => ({
      id: `page-${item.id}`,
      kind: "page" as const,
      label: item.label,
      href: item.href,
    }));
}

/**
 * Sets as rows: the editor for someone who may change the set, the read-only view
 * for a library reader, and for a Musikant the set as it sits on one of their
 * projects — taken from the expanded `projects`, which the API fills with the
 * ones that reader may see.
 *
 * A set that opens nowhere is dropped rather than offered as a dead row. For a
 * Musikant that means a set on none of their running projects simply isn't
 * offered, which is the same set the API would refuse them anyway.
 */
export function setResults(
  sets: MusicSet[],
  capabilities: SetRouteCapabilities,
): QuickJumpResult[] {
  return sets.flatMap((set) => {
    // The first expanded project, since a reader who needs one needs only one.
    // Their order isn't documented, and for a Musikant there is rarely more than
    // a single running project to choose between.
    const href = set.id
      ? setRouteFor(set.id, capabilities, set.projects?.[0]?.id)
      : null;
    if (!href) return [];

    const byline = [set.composer, set.arranger && `Arr. ${set.arranger}`]
      .filter((part): part is string => !!part)
      .join(" · ");

    return [
      {
        id: `set-${set.id}`,
        kind: "set" as const,
        label: set.title || "Uten tittel",
        detail: byline || undefined,
        meta:
          typeof set.archiveNumber === "number"
            ? `#${set.archiveNumber}`
            : undefined,
        href,
      },
    ];
  });
}

/**
 * Projects as rows, leading to the member's view of the project — the same page
 * Hjem leads to, which carries its own shortcut on to the editor for anyone who
 * may change it. The date range is only shown when the project has both ends of
 * one; half a range says less than no range at all.
 */
export function projectResults(projects: Project[]): QuickJumpResult[] {
  return projects.flatMap((project) =>
    project.id
      ? [
          {
            id: `project-${project.id}`,
            kind: "project" as const,
            label: project.name || "Uten navn",
            meta:
              project.startDate && project.endDate
                ? `${formatDmyShort(project.startDate)}–${formatDmyShort(project.endDate)}`
                : undefined,
            href: `/project/${project.id}`,
          },
        ]
      : [],
  );
}

/**
 * Members as rows, filtered by name on the client — `GET /musicians` takes no
 * search options and serves the whole band in one small response, so it is
 * fetched once and filtered here.
 *
 * Seated through `rosterSections` — the roster's own model, run over the one
 * musician — rather than through a rule of its own. A row and the card it leads
 * to have to agree about what somebody plays, and every attempt to keep two
 * rules in step has drifted: first the API's own order put `Solokornett 1-2` on a
 * player of the plain `Solokornett`, then the chair-versus-instrument split
 * arrived and would have done it again. This way there is one rule.
 *
 * It also settles which members are offered at all: a musician the roster can't
 * seat — every stemme of theirs outside an instrument group — comes back with no
 * sections, and a row leading to a page that doesn't show them is no use.
 */
export function memberResults(
  musicians: Musician[],
  query: string,
): QuickJumpResult[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  return musicians.flatMap((musician) => {
    if (!musician.id || !matches(musician.name, needle)) return [];

    const sections = rosterSections([musician]);
    if (!sections.length) return [];

    return [
      {
        id: `member-${musician.id}`,
        kind: "member" as const,
        label: musician.name || "Uten navn",
        // In band order, since that is the order the sections came back in.
        detail: sections.map((section) => section.group).join(" · "),
        // The first section is the one `/roster?member=` will open them under.
        meta: sections[0].seats[0]?.label,
        href: `/roster?member=${musician.id}`,
      },
    ];
  });
}

/**
 * The groups the palette draws, in reading order, leaving out the empty ones.
 *
 * Content leads and the pages come last: the first row is the selected one, so
 * typing a title has to land on that title rather than on a page whose name
 * happens to share a letter with it. With nothing typed there is no content to
 * lead, and the pages are the whole list.
 */
export function quickJumpGroups(sources: {
  sets: QuickJumpResult[];
  projects: QuickJumpResult[];
  members: QuickJumpResult[];
  pages: QuickJumpResult[];
  /**
   * The kinds whose API page came back full. Taken from the raw response rather
   * than from the rows above, because mapping can drop some — a set with no route
   * for this reader — and a short group is then still a capped one.
   */
  capped?: QuickJumpKind[];
}): QuickJumpGroup[] {
  const wasCapped = (kind: QuickJumpKind) =>
    sources.capped?.includes(kind) ?? false;

  return [
    {
      kind: "set" as const,
      heading: "Notesett",
      results: sources.sets,
      capped: wasCapped("set"),
    },
    {
      kind: "project" as const,
      heading: "Prosjekter",
      results: sources.projects,
      capped: wasCapped("project"),
    },
    {
      kind: "member" as const,
      heading: "Korpset",
      results: sources.members,
      capped: false,
    },
    {
      kind: "page" as const,
      heading: "Gå til",
      results: sources.pages,
      capped: false,
    },
  ].filter((group) => group.results.length > 0);
}

/** Every row in display order — what the arrow keys walk. */
export function flattenGroups(groups: QuickJumpGroup[]): QuickJumpResult[] {
  return groups.flatMap((group) => group.results);
}

/**
 * The next selected row, wrapping at both ends — from the last row down to the
 * first, and from the first up to the last. Wrapping rather than stopping
 * because the list is short: reaching the bottom and finding the top is quicker
 * than reversing direction. An empty list stays at 0 rather than going negative.
 */
export function stepIndex(
  current: number,
  delta: number,
  length: number,
): number {
  if (length < 1) return 0;
  return (current + delta + length) % length;
}
