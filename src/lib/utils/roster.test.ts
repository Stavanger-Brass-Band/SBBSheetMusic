import { describe, expect, it } from "vitest";
import type { InstrumentGroup, Musician, Part } from "$lib/types";
import { profilePictureVersion } from "./profilePicture";
import {
  managingRoleLabel,
  ownSectionIds,
  rosterMemberCount,
  rosterSections,
  seatOf,
  sectionIdFor,
} from "./roster";

/**
 * A stemme as `GET /musicians` hands it over — the catalogue's own view model, so
 * the group and the rank travel with it. That is the whole reason the roster can
 * be built without reading the parts catalogue.
 */
const part = (
  name: string,
  group: InstrumentGroup,
  sortOrder: number,
): Part => ({ id: name, name, instrumentGroup: group, sortOrder });

const SOLO_CORNET = part("Solo kornett", "Kornett", 10);
const SECOND_CORNET = part("2. kornett", "Kornett", 20);
const EB_CORNET = part("Ess-kornett", "Kornett", 30);
const FIRST_HORN = part("1. horn", "Horn og flygelhorn", 40);
const BASS_TROMBONE = part("Basstrombone", "Tromboner", 50);

let nextMusicianId = 0;
function musician(overrides: Partial<Musician> = {}): Musician {
  nextMusicianId += 1;
  return {
    id: `musician-${nextMusicianId}`,
    name: "Ola Nordmann",
    roles: ["Musikant"],
    parts: [],
    ...overrides,
  };
}

const seatedNames = (sections: ReturnType<typeof rosterSections>) =>
  sections.map((section) => [
    section.group,
    section.seats.map((seat) => seat.musician.name),
  ]);

describe("rosterSections", () => {
  it("groups musicians by the instrument group of their stemmer", () => {
    const cornetPlayer = musician({
      name: "Anders Haugen",
      parts: [SOLO_CORNET],
    });
    const hornPlayer = musician({ name: "Ola Gjerde", parts: [FIRST_HORN] });

    expect(seatedNames(rosterSections([hornPlayer, cornetPlayer]))).toEqual([
      ["Kornett", ["Anders Haugen"]],
      ["Horn og flygelhorn", ["Ola Gjerde"]],
    ]);
  });

  it("keeps the sections in the catalogue's band order", () => {
    const sections = rosterSections([
      musician({ parts: [BASS_TROMBONE] }),
      musician({ parts: [FIRST_HORN] }),
      musician({ parts: [SOLO_CORNET] }),
    ]);

    expect(sections.map((section) => section.group)).toEqual([
      "Kornett",
      "Horn og flygelhorn",
      "Tromboner",
    ]);
  });

  it("leaves out the groups nobody plays in", () => {
    const sections = rosterSections([musician({ parts: [SOLO_CORNET] })]);
    expect(sections).toHaveLength(1);
  });

  it("orders a section by stemme rank, then by name", () => {
    const sections = rosterSections([
      musician({ name: "Åse Vikane", parts: [SECOND_CORNET] }),
      musician({ name: "Bjørn Nese", parts: [SECOND_CORNET] }),
      musician({ name: "Zakarias Aske", parts: [SOLO_CORNET] }),
    ]);

    expect(seatedNames(sections)).toEqual([
      ["Kornett", ["Zakarias Aske", "Bjørn Nese", "Åse Vikane"]],
    ]);
  });

  it("sorts a stemme the API sent no rank for after the ranked ones", () => {
    const unranked: Part = {
      id: "x",
      name: "Kornett x",
      instrumentGroup: "Kornett",
    };
    const sections = rosterSections([
      musician({ name: "Uten rang", parts: [unranked] }),
      musician({ name: "Med rang", parts: [SECOND_CORNET] }),
    ]);

    expect(seatedNames(sections)).toEqual([
      ["Kornett", ["Med rang", "Uten rang"]],
    ]);
  });

  it("seats a member by the highest-ranked stemme they hold in the section", () => {
    const sections = rosterSections([
      musician({ name: "Anders Haugen", parts: [EB_CORNET, SOLO_CORNET] }),
    ]);

    expect(sections[0].seats[0].part.name).toBe("Solo kornett");
  });

  /**
   * The catalogue ranks `Solokornett` and `Solokornett 1-2` alike, so the rank
   * cannot pick between them and the order the API listed a member's
   * assignments in must not either. Both hold the same pair, so both print the
   * same thing — the instrument, never the chair.
   */
  it("prints the same stemme for members holding the same pair", () => {
    const solo = part("Solokornett", "Kornett", 4);
    const soloOneTwo = part("Solokornett 1-2", "Kornett", 4);
    const sections = rosterSections([
      musician({ name: "Kornettist", parts: [soloOneTwo, solo] }),
      musician({ name: "Leif Bjarte Johansson", parts: [solo, soloOneTwo] }),
    ]);

    expect(sections[0].seats.map((seat) => seat.label)).toEqual([
      "Solokornett",
      "Solokornett",
    ]);
  });

  /**
   * The real Kornett section, and the whole point of ordering by the chair while
   * printing the instrument: every solo cornet prints `Solokornett`, and the
   * 1-2 players still stand above the 3-4 players. The names here are chosen to
   * interleave alphabetically, so the assertion fails if the order falls back to
   * them.
   */
  it("stands the 1-2 chairs above the 3-4 chairs, whatever the names", () => {
    const esskornett = part("Esskornett", "Kornett", 3);
    const solo = part("Solokornett", "Kornett", 4);
    const soloOneTwo = part("Solokornett 1-2", "Kornett", 4);
    const soloThreeFour = part("Solokornett 3-4", "Kornett", 5);

    const sections = rosterSections([
      musician({ name: "Anna Aas", parts: [solo, soloThreeFour] }),
      musician({ name: "Bodil Berg", parts: [soloOneTwo, solo] }),
      musician({ name: "Cato Dahl", parts: [solo, soloThreeFour] }),
      musician({ name: "Dagny Eide", parts: [soloOneTwo, solo] }),
      musician({ name: "Øystein Hodne", parts: [esskornett] }),
    ]);

    expect(
      sections[0].seats.map((seat) => [seat.musician.name, seat.label]),
    ).toEqual([
      ["Øystein Hodne", "Esskornett"],
      ["Bodil Berg", "Solokornett"],
      ["Dagny Eide", "Solokornett"],
      ["Anna Aas", "Solokornett"],
      ["Cato Dahl", "Solokornett"],
    ]);
  });

  /**
   * Production data, Tuba: three Eb players hold the plain `Eb tuba` plus a
   * numbered chair, and read as Eb tuba players — the same way the Bb players
   * read, who have no chair to be mistaken for. The chair still orders them, so
   * 1st stands above 2nd.
   */
  it("prints the instrument, not the chair, and orders by the chair", () => {
    const ebTuba = part("Eb tuba", "Tuba", 19);
    const firstEb = part("1. Eb tuba", "Tuba", 19);
    const secondEb = part("2. Eb tuba", "Tuba", 19);
    const bbTuba = part("Bb tuba", "Tuba", 20);

    const sections = rosterSections([
      musician({ name: "Tomine Selvik Nygaard", parts: [ebTuba, secondEb] }),
      musician({ name: "Amund Buer", parts: [ebTuba, firstEb] }),
      musician({ name: "Tom Christensen", parts: [bbTuba] }),
    ]);

    expect(
      sections[0].seats.map((seat) => [seat.musician.name, seat.label]),
    ).toEqual([
      ["Amund Buer", "Eb tuba"],
      ["Tomine Selvik Nygaard", "Eb tuba"],
      ["Tom Christensen", "Bb tuba"],
    ]);
  });

  /**
   * Production data, Slagverk: percussionists hold seven to eleven stemmer each,
   * and no one of them is theirs. Naming one misrepresented them — three players
   * covering the same kit read as a Klokkespill player, a Klokkespill player and
   * a Percussion 1 player. The section is the truer answer, and it is the same
   * answer for all of them.
   */
  it("prints the section for a member who covers several of its instruments", () => {
    const percussion = (name: string) => part(name, "Slagverk", 21);
    const sections = rosterSections([
      musician({
        name: "Morten Tønnesen",
        parts: [
          percussion("Percussion 3"),
          percussion("Trommesett"),
          percussion("Timpani"),
          percussion("Percussion 1"),
        ],
      }),
      musician({
        name: "Ulrik Rosenberg",
        parts: [
          percussion("Klokkespill"),
          percussion("Percussion 1"),
          percussion("Vibrafon"),
          percussion("Marimba"),
        ],
      }),
    ]);

    expect(sections[0].seats.map((seat) => seat.label)).toEqual([
      "Slagverk",
      "Slagverk",
    ]);
  });

  /**
   * A section whose chairs are all the catalogue has — there is no general
   * `kornett` stemme — so the chair is the whole truth and gets printed.
   */
  it("prints the chair when the catalogue offers no instrument above it", () => {
    const sections = rosterSections([
      musician({
        name: "Gunnar Hodne",
        parts: [part("2. kornett", "Kornett", 7)],
      }),
    ]);

    expect(sections[0].seats[0].label).toBe("2. kornett");
  });

  /**
   * Where the ranks genuinely differ the rank still decides, so the name
   * tie-break can't quietly reorder a section the catalogue already ordered.
   */
  it("lets the catalogue rank win over the name when they disagree", () => {
    const first = part("Zzz første", "Kornett", 10);
    const second = part("Aaa andre", "Kornett", 20);
    const sections = rosterSections([
      musician({ name: "B", parts: [second] }),
      musician({ name: "A", parts: [first] }),
    ]);

    expect(sections[0].seats.map((seat) => seat.part.name)).toEqual([
      "Zzz første",
      "Aaa andre",
    ]);
  });

  it("shows a member in every section they play in", () => {
    const doubling = musician({
      name: "Tuva Helleland",
      parts: [SOLO_CORNET, FIRST_HORN],
    });
    const sections = rosterSections([doubling]);

    expect(seatedNames(sections)).toEqual([
      ["Kornett", ["Tuva Helleland"]],
      ["Horn og flygelhorn", ["Tuva Helleland"]],
    ]);
    // Seated by the stemme that belongs to each section, not by the first one.
    expect(sections.map((section) => section.seats[0].part.name)).toEqual([
      "Solo kornett",
      "1. horn",
    ]);
  });

  it("leaves out a member whose stemmer have no instrument group", () => {
    const oneOff: Part = { id: "fanfare", name: "Fanfare", sortOrder: 60 };
    expect(rosterSections([musician({ parts: [oneOff] })])).toEqual([]);
  });

  it("leaves out a member with no stemmer at all", () => {
    expect(rosterSections([musician({ parts: [] })])).toEqual([]);
    expect(rosterSections([musician({ parts: null })])).toEqual([]);
  });
});

describe("rosterMemberCount", () => {
  it("counts a member seated in two sections once", () => {
    const sections = rosterSections([
      musician({ name: "Tuva Helleland", parts: [SOLO_CORNET, FIRST_HORN] }),
      musician({ name: "Ola Gjerde", parts: [FIRST_HORN] }),
    ]);

    expect(rosterMemberCount(sections)).toBe(2);
  });

  it("counts nobody in an empty roster", () => {
    expect(rosterMemberCount(rosterSections([]))).toBe(0);
  });
});

describe("managingRoleLabel", () => {
  it("names the widest role that carries responsibility", () => {
    expect(managingRoleLabel(["Musikant", "Admin"])).toBe("Administrator");
    expect(managingRoleLabel(["Noteansvarlig"])).toBe("Noteansvarlig");
    expect(managingRoleLabel(["Musikant", "Prosjektleder"])).toBe(
      "Prosjektleder",
    );
  });

  it("names nothing for the read-only roles nearly everyone holds", () => {
    expect(managingRoleLabel(["Musikant"])).toBeNull();
    expect(managingRoleLabel(["Musikant", "Arkivleser"])).toBeNull();
    expect(managingRoleLabel([])).toBeNull();
  });
});

describe("sectionIdFor", () => {
  it("turns a group name into a readable anchor", () => {
    expect(sectionIdFor("Kornett")).toBe("kornett");
    expect(sectionIdFor("Horn og flygelhorn")).toBe("horn-og-flygelhorn");
  });

  it("spells Norwegian letters out rather than dropping them", () => {
    expect(sectionIdFor("Slagverk og pauker")).toBe("slagverk-og-pauker");
    expect(sectionIdFor("Bøyd Æ Å")).toBe("boyd-ae-a");
  });
});

/**
 * The card falls back to initials for a member with no picture, which turns on
 * the version being absent — the roster's `profilePicture` is the very shape the
 * admin pages read, so the same helper answers for both.
 */
describe("profilePictureVersion for a musician", () => {
  it("reads the version of a member who has a picture", () => {
    const withPicture = musician({ profilePicture: { version: "v2" } });
    expect(profilePictureVersion(withPicture)).toBe("v2");
  });

  it("answers null for a member with no picture, so the avatar shows initials", () => {
    expect(profilePictureVersion(musician())).toBeNull();
    expect(
      profilePictureVersion(musician({ profilePicture: null })),
    ).toBeNull();
  });
});

/**
 * Finding yourself on the roster, and finding one particular member from a link.
 * Both read off the sections rather than the flat list, so they can only ever
 * answer with somebody the page actually shows.
 */
describe("ownSectionIds", () => {
  it("names the section the signed-in member sits in", () => {
    const me = musician({ id: "me", parts: [SOLO_CORNET] });
    const sections = rosterSections([me, musician({ parts: [FIRST_HORN] })]);

    expect(ownSectionIds(sections, "me")).toEqual(["kornett"]);
  });

  it("names both sections for a member who plays across two", () => {
    const me = musician({ id: "me", parts: [SOLO_CORNET, BASS_TROMBONE] });
    const sections = rosterSections([me]);

    expect(ownSectionIds(sections, "me")).toEqual(["kornett", "tromboner"]);
  });

  it("answers with nothing before we know who is signed in", () => {
    const sections = rosterSections([musician({ parts: [SOLO_CORNET] })]);

    expect(ownSectionIds(sections, null)).toEqual([]);
  });

  it("answers with nothing for a member the roster can't seat", () => {
    const sections = rosterSections([musician({ parts: [SOLO_CORNET] })]);

    expect(ownSectionIds(sections, "someone-else")).toEqual([]);
  });
});

describe("seatOf", () => {
  it("finds a member and the section they are seated in", () => {
    const target = musician({ id: "them", name: "Kari", parts: [FIRST_HORN] });
    const sections = rosterSections([
      musician({ parts: [SOLO_CORNET] }),
      target,
    ]);

    expect(seatOf(sections, "them")).toEqual({
      musician: target,
      group: "Horn og flygelhorn",
    });
  });

  /** The section a band sits in first, which is the page's own reading order. */
  it("opens a member seated twice under the earlier section", () => {
    const target = musician({
      id: "them",
      parts: [BASS_TROMBONE, SOLO_CORNET],
    });

    expect(seatOf(rosterSections([target]), "them")?.group).toBe("Kornett");
  });

  it("finds nobody for an id the roster doesn't show", () => {
    const sections = rosterSections([musician({ parts: [SOLO_CORNET] })]);

    expect(seatOf(sections, "nobody")).toBeNull();
  });
});
