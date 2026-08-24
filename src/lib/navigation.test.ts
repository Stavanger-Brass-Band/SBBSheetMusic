import { describe, expect, it } from "vitest";
import { navigationFor, sectionFor } from "./navigation";
import { capabilitiesFrom } from "./roles";

/** Labels only — the ids and hrefs are asserted where they matter below. */
const labelsOf = (items: { label: string }[]) =>
  items.map((item) => item.label);

describe("navigationFor", () => {
  it("gives a member with no roles only Hjem and Korpset", () => {
    const navigation = navigationFor(capabilitiesFrom([]));

    expect(labelsOf(navigation.primary)).toEqual(["Hjem", "Korpset"]);
    expect(navigation.admin).toEqual([]);
  });

  it("gives a Musikant the archive but nothing administrative", () => {
    const navigation = navigationFor(capabilitiesFrom(["Musikant"]));

    expect(labelsOf(navigation.primary)).toEqual([
      "Hjem",
      "Arkivliste",
      "Korpset",
    ]);
    expect(navigation.admin).toEqual([]);
  });

  /**
   * Prosjektleder grants project management without any catalog access of its
   * own, so the row it produces has no Arkivliste in it — the role is normally
   * held alongside Musikant or Arkivleser, which is what puts it back.
   */
  it("keeps Prosjekter primary for a Prosjektleder, who has no overflow", () => {
    const navigation = navigationFor(capabilitiesFrom(["Prosjektleder"]));

    expect(labelsOf(navigation.primary)).toEqual([
      "Hjem",
      "Prosjekter",
      "Korpset",
    ]);
    expect(navigation.admin).toEqual([]);

    expect(
      labelsOf(
        navigationFor(capabilitiesFrom(["Prosjektleder", "Musikant"])).primary,
      ),
    ).toEqual(["Hjem", "Arkivliste", "Prosjekter", "Korpset"]);
  });

  it("folds the catalogue pages behind Mer for a Noteansvarlig", () => {
    const navigation = navigationFor(capabilitiesFrom(["Noteansvarlig"]));

    expect(labelsOf(navigation.primary)).toEqual([
      "Hjem",
      "Arkivliste",
      "Prosjekter",
      "Korpset",
    ]);
    expect(labelsOf(navigation.admin)).toEqual(["Stemmekatalog", "Kategorier"]);
  });

  it("adds Brukere to the overflow for an Admin, and nothing to the primary row", () => {
    const navigation = navigationFor(capabilitiesFrom(["Admin"]));

    expect(labelsOf(navigation.admin)).toEqual([
      "Stemmekatalog",
      "Kategorier",
      "Brukere",
    ]);
  });

  /**
   * The header's collapse threshold is measured against the widest row there is,
   * so the primary row growing is the thing that would silently invalidate it.
   */
  it("never puts more than four links in the primary row", () => {
    for (const roles of [
      [],
      ["Musikant"],
      ["Arkivleser"],
      ["Prosjektleder"],
      ["Noteansvarlig"],
      ["Admin"],
      ["Admin", "Musikant", "Prosjektleder"],
    ]) {
      expect(
        navigationFor(capabilitiesFrom(roles)).primary.length,
      ).toBeLessThanOrEqual(4);
    }
  });

  it("only offers destinations the reader's roles reach", () => {
    const musikant = navigationFor(capabilitiesFrom(["Musikant"]));

    expect([...musikant.primary, ...musikant.admin].map((i) => i.href)).toEqual(
      ["/", "/archive", "/roster"],
    );
  });
});

describe("sectionFor", () => {
  it("keeps Hjem active down through a project and its sets", () => {
    expect(sectionFor("/")).toBe("home");
    expect(sectionFor("/project/abc")).toBe("home");
    expect(sectionFor("/project/abc/set/def")).toBe("home");
  });

  it("puts an editor route under the admin section it belongs to", () => {
    expect(sectionFor("/set/edit/abc")).toBe("archive");
    expect(sectionFor("/project/edit/abc")).toBe("projects");
    expect(sectionFor("/user/edit/abc")).toBe("users");
    expect(sectionFor("/part/edit/abc")).toBe("parts");
  });

  it("puts the read-only set view under Arkivliste, where it is reached from", () => {
    expect(sectionFor("/set/abc")).toBe("archive");
  });

  it("names the sections that own their own list page", () => {
    expect(sectionFor("/archive")).toBe("archive");
    expect(sectionFor("/projects")).toBe("projects");
    expect(sectionFor("/parts")).toBe("parts");
    expect(sectionFor("/categories")).toBe("categories");
    expect(sectionFor("/users")).toBe("users");
    expect(sectionFor("/roster")).toBe("roster");
  });

  /**
   * Every id the navigation can produce has to be an answer `sectionFor` can
   * give, or that link can never read as active.
   */
  it("answers with an id for every link the navigation offers", () => {
    const navigation = navigationFor(capabilitiesFrom(["Admin"]));

    for (const item of [...navigation.primary, ...navigation.admin]) {
      expect(sectionFor(item.href)).toBe(item.id);
    }
  });
});
