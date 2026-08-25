/**
 * The band's roster turned from the flat list the API serves into the sections
 * the Korpset page shows: one per instrument group, in the standard brass band
 * order, each holding the members who play a stemme in it.
 *
 * All of it reads off the musician's own parts. The Brukere list has to look an
 * instrument group up in the parts catalogue (see `userInstrumentGroups`) because
 * `GET /users` says nothing about which of a part's fields it fills in — but
 * `GET /musicians` documents a full `ApiPart` per stemme, `instrumentGroup` and
 * `sortOrder` included, and it has to: the page is open to every member, and an
 * ordinary Musikant cannot read the catalogue to look anything up in.
 */

import { capabilitiesFrom, primaryRoleLabel } from "$lib/roles";
import {
  INSTRUMENT_GROUPS,
  type InstrumentGroup,
  type Musician,
  type Part,
} from "$lib/types";

/** One member's place in one section, and the stemme that puts them there. */
export interface RosterSeat {
  musician: Musician;
  /**
   * The stemme this section *orders* them by: the finest one they hold, which is
   * a numbered chair wherever the catalogue has one. It is not always what the
   * card prints — see `label`.
   *
   * Ordering by the chair is what puts the Solokornett 1-2 players above the
   * 3-4 players, who otherwise all held the same plain `Solokornett` and fell
   * back to running alphabetically.
   */
  part: Part;
  /**
   * What the card prints. The instrument rather than the chair: a tuba player is
   * an "Eb tuba", not a "2. Eb tuba" — which chair they take is a seating
   * question, not who they are. Falls back to the section's own name for someone
   * who covers several of its instruments, which is every percussionist.
   */
  label: string;
}

export interface RosterSection {
  group: InstrumentGroup;
  /** The anchor the jump chips scroll to — see `sectionIdFor`. */
  id: string;
  seats: RosterSeat[];
}

/**
 * The sections a roster falls into, in `INSTRUMENT_GROUPS` order, leaving out the
 * ones nobody sits in — an empty band heading says nothing a reader needs, and a
 * jump chip leading to one would be a dead end.
 *
 * A member with stemmer in more than one section appears in each of them, seated
 * by the stemme that belongs there. One whose every stemme has no instrument
 * group at all lands in no section and so is not shown; `rosterMemberCount`
 * counts what the page actually holds rather than what the API sent, so the tally
 * can't disagree with the faces under it.
 */
export function rosterSections(musicians: Musician[]): RosterSection[] {
  return INSTRUMENT_GROUPS.map((group) => ({
    group,
    id: sectionIdFor(group),
    seats: seatsIn(group, musicians),
  })).filter((section) => section.seats.length > 0);
}

/**
 * How many people the roster shows. Counted by identity rather than by adding the
 * sections up, so somebody seated in two of them is still one member.
 */
export function rosterMemberCount(sections: RosterSection[]): number {
  return new Set(
    sections.flatMap((section) => section.seats.map((seat) => seat.musician)),
  ).size;
}

/**
 * The sections a member sits in, as anchor ids — usually one, two for someone
 * who plays across the band, none for a member the roster can't seat.
 *
 * Ids rather than groups because that is what the jump chips and the section
 * markers both address, and `null` is accepted so a page can ask before
 * `/users/me` has answered with who is signed in.
 */
export function ownSectionIds(
  sections: RosterSection[],
  userId: string | null,
): string[] {
  if (!userId) return [];
  return sections
    .filter((section) =>
      section.seats.some((seat) => seat.musician.id === userId),
    )
    .map((section) => section.id);
}

/**
 * One member's seat, looked up across every section — what a link to a
 * particular member (`/roster?member=…`) resolves to.
 *
 * The first section they sit in is the answer, which for the great majority who
 * play in one is the only one. Someone seated twice opens under the section a
 * band sits in first, which is the same place the page's own reading order puts
 * them.
 */
export function seatOf(
  sections: RosterSection[],
  musicianId: string,
): { musician: Musician; group: InstrumentGroup } | null {
  for (const section of sections) {
    const seat = section.seats.find((s) => s.musician.id === musicianId);
    if (seat) return { musician: seat.musician, group: section.group };
  }
  return null;
}

/**
 * The role worth printing on a member's card, or `null` for the great majority
 * who hold none of them.
 *
 * Only the roles that come with responsibility for something — the archive, the
 * projects, the accounts — are named. `Musikant` and `Arkivleser` are grants for
 * reading notes, held by nearly everyone, and a badge on every single card would
 * say nothing while drowning out the three that do. The widest of the ones that
 * qualify is the label, in the same spelling the account menu uses.
 */
export function managingRoleLabel(roles: string[]): string | null {
  const capabilities = capabilitiesFrom(roles);
  const hasResponsibility =
    capabilities.isAdmin ||
    capabilities.canManageMusic ||
    capabilities.canManageProjects;
  return hasResponsibility ? primaryRoleLabel(capabilities) : null;
}

/** Norwegian letters an anchor cannot carry, spelled the way they are read. */
const ASCII_FOLDING: Record<string, string> = { æ: "ae", ø: "o", å: "a" };

/**
 * A section's anchor id, from the group's own name — `Horn og flygelhorn` becomes
 * `horn-og-flygelhorn`, so a link to a section is readable and keeps working as
 * long as the group is named the same.
 */
export function sectionIdFor(group: string): string {
  return group
    .toLowerCase()
    .replace(/[æøå]/g, (letter) => ASCII_FOLDING[letter])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Everyone playing in one section, seated in the order a band sits: by the
 * stemme that seats them, then by their own name.
 *
 * Comparing the stemmer by the same rule the seat was chosen with is what keeps
 * the two from disagreeing — everyone seated under one stemme stands together,
 * rather than the whole section running alphabetically the moment the catalogue
 * ranks two stemmer alike.
 */
function seatsIn(group: InstrumentGroup, musicians: Musician[]): RosterSeat[] {
  return musicians
    .map((musician) => seatFor(musician, group))
    .filter((seat): seat is RosterSeat => seat !== null)
    .sort(
      (a, b) =>
        comparePartsForSeating(a.part, b.part) ||
        (a.musician.name ?? "").localeCompare(b.musician.name ?? "", "nb-NO"),
    );
}

/**
 * Whether a stemme's name names a *chair* rather than an instrument — `1. Eb
 * tuba`, `2. kornett`, `Solokornett 1-2`, `Percussion 3` — as against `Eb tuba`,
 * `Solokornett` or `Timpani`.
 *
 * Read off the name because nothing else in the catalogue says so. `Eb tuba`,
 * `1. Eb tuba` and `2. Eb tuba` arrive with the same `sortOrder` (19), the same
 * `indexable` and the same `alwaysDisplay`, so there is no field to ask. That
 * makes this a heuristic on Norwegian part naming, and the honest fix is a flag
 * on the part itself — worth asking the API for. Until then it recognises the two
 * shapes the catalogue actually uses: a leading `N.` and a trailing number or
 * range.
 *
 * Deliberately narrow. A digit inside a name is not a chair (`Bb tuba` keeps its
 * B flat), and a name with no number at all never is.
 */
function isNumberedChair(name: string | undefined): boolean {
  return /^\s*\d+\s*\.|\s\d+\s*(?:-\s*\d+)?\s*$/.test(name ?? "");
}

/**
 * A musician's seat in this section, or `null` when they play nothing in it.
 *
 * Two separate questions, which used to share one answer and shouldn't:
 *
 * - **Where do they sit?** The finest stemme they hold — their chair if the
 *   catalogue has one. This is what orders the section, so the 1-2 players come
 *   above the 3-4 players even though both print the same thing.
 * - **What do they play?** The instrument, not the chair. One instrument among
 *   their stemmer is the label; several means they cover the section rather than
 *   a seat in it, and the section's own name is the truer answer — a
 *   percussionist holding eleven stemmer is a `Slagverk` player, not a
 *   `Klokkespill` player, and picking one of the eleven only ever misrepresented
 *   them. Nothing but chairs (a plain `2. kornett`, where the catalogue has no
 *   general `kornett`) falls back to the chair, which is then the whole truth.
 */
function seatFor(
  musician: Musician,
  group: InstrumentGroup,
): RosterSeat | null {
  const parts = (musician.parts ?? []).filter(
    (part) => part.instrumentGroup === group,
  );
  if (!parts.length) return null;

  const chairs = parts.filter((part) => isNumberedChair(part.name));
  const instruments = parts.filter((part) => !isNumberedChair(part.name));

  const part = finestPart(chairs.length ? chairs : instruments);
  if (!part) return null;

  const label =
    instruments.length === 1
      ? (instruments[0].name ?? group)
      : instruments.length > 1
        ? group
        : (part.name ?? group);

  return { musician, part, label };
}

/**
 * The first of these stemmer in seating order (see `comparePartsForSeating`) —
 * the one that decides where their holder sits.
 */
function finestPart(parts: Part[]): Part | undefined {
  return [...parts].sort(comparePartsForSeating)[0];
}

/**
 * Two stemmer in seating order: by the catalogue's rank, and by name where the
 * catalogue ranks them alike. A stemme the API sent no rank for sorts after the
 * ranked ones rather than jumping the queue.
 *
 * The name is not a decoration on the rank — it is what makes the seat the same
 * answer for everyone. The catalogue gives `Solokornett` and `Solokornett 1-2`
 * one and the same rank, so rank alone left the winner to whichever order the
 * API happened to list a member's assignments in: two players holding that very
 * same pair were seated under different names, and a section read as though they
 * played apart. Comparing the names settles it once, and settles it the same way
 * every time — the plain `Solokornett` leading its numbered variants, being
 * their prefix.
 */
function comparePartsForSeating(a: Part, b: Part): number {
  return (
    compareRank(a.sortOrder, b.sortOrder) ||
    (a.name ?? "").localeCompare(b.name ?? "", "nb-NO")
  );
}

/** Compared rather than subtracted, so two unranked stemmer don't give `NaN`. */
function compareRank(a: number | undefined, b: number | undefined): number {
  const first = a ?? Infinity;
  const second = b ?? Infinity;
  if (first === second) return 0;
  return first < second ? -1 : 1;
}
