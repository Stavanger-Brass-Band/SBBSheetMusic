import { describe, expect, it } from "vitest";
import {
  addedEntries,
  classifyUnresolved,
  splitMissingParts,
} from "./pdfImportSummary";

describe("splitMissingParts", () => {
  it("splits the API's comma-separated note into entries", () => {
    expect(splitMissingParts("Kornett 3, Pauker")).toEqual([
      "Kornett 3",
      "Pauker",
    ]);
  });

  it("drops the empty entries a trailing comma leaves behind", () => {
    expect(splitMissingParts("Pauker, ,")).toEqual(["Pauker"]);
  });

  it("reads an unset note as nothing missing", () => {
    expect(splitMissingParts(null)).toEqual([]);
    expect(splitMissingParts(undefined)).toEqual([]);
    expect(splitMissingParts("")).toEqual([]);
  });
});

describe("addedEntries", () => {
  it("reports only what the set didn't already have", () => {
    expect(addedEntries(["Kornett 1"], ["Kornett 1", "Pauker"])).toEqual([
      "Pauker",
    ]);
  });

  /**
   * The whole point of the comparison: the import appends to the same free-text
   * field a person writes their own notes in, so anything that was already
   * there must not be reported as the import's doing.
   */
  it("leaves a person's own note out of the import's result", () => {
    expect(
      addedEntries(
        ["Mangler 2. trombone — må scannes"],
        ["Mangler 2. trombone — må scannes", "UNRECOGNIZED"],
      ),
    ).toEqual(["UNRECOGNIZED"]);
  });

  // The API dedupes its unresolved list casefolded, so the same header coming
  // back differently cased is not something new.
  it("treats a differently cased entry as one it already had", () => {
    expect(addedEntries(["pauker"], ["PAUKER"])).toEqual([]);
  });

  /**
   * A set can hold several entries under one part name — that is why the part
   * lists are unkeyed — and the summary should name it once.
   */
  it("names a repeated entry once", () => {
    expect(addedEntries([], ["Percussion 1", "Percussion 1"])).toEqual([
      "Percussion 1",
    ]);
  });

  it("keeps the order the set came back in", () => {
    expect(addedEntries([], ["Partitur", "Kornett 1", "Pauker"])).toEqual([
      "Partitur",
      "Kornett 1",
      "Pauker",
    ]);
  });

  it("ignores empty entries", () => {
    expect(addedEntries([], ["", "Pauker"])).toEqual(["Pauker"]);
  });

  it("reports nothing when the import placed nothing new", () => {
    expect(
      addedEntries(["Partitur", "Pauker"], ["Partitur", "Pauker"]),
    ).toEqual([]);
  });
});

describe("classifyUnresolved", () => {
  it("keeps a header the API read but couldn't place", () => {
    expect(classifyUnresolved(["Flugel Horn"])).toEqual({
      headerTexts: ["Flugel Horn"],
      hadUnreadablePages: false,
    });
  });

  /**
   * The case a partitur lands in: no readable header on any page, so the API
   * parks them under its marker and drops the content. Showing that marker as a
   * part name would send someone looking for a stemme called "UNRECOGNIZED".
   */
  it("reads the marker as dropped pages rather than a part name", () => {
    expect(classifyUnresolved(["UNRECOGNIZED"])).toEqual({
      headerTexts: [],
      hadUnreadablePages: true,
    });
  });

  it("separates the two when an import produced both", () => {
    expect(classifyUnresolved(["UNRECOGNIZED", "Flugel Horn"])).toEqual({
      headerTexts: ["Flugel Horn"],
      hadUnreadablePages: true,
    });
  });

  it("says nothing happened for an import with nothing unresolved", () => {
    expect(classifyUnresolved([])).toEqual({
      headerTexts: [],
      hadUnreadablePages: false,
    });
  });
});
