import { describe, expect, it } from "vitest";
import {
  NO_GROUP_FILTER,
  partsListHref,
  partsListQueryParams,
  readPartsListQuery,
} from "./partsListQuery";

const GROUPS = ["Kornett", "Tuba", "Slagverk"];

describe("partsListQueryParams", () => {
  it("leaves an unfiltered list without params, so the URL stays bare", () => {
    expect(partsListQueryParams("", "")).toEqual([]);
  });

  it("carries the search term, trimmed and encoded", () => {
    expect(partsListQueryParams("  eb bass  ", "")).toEqual([
      "search=eb%20bass",
    ]);
  });

  it("carries a group whose name needs encoding", () => {
    expect(partsListQueryParams("", "Horn og flygelhorn")).toEqual([
      "group=Horn%20og%20flygelhorn",
    ]);
  });

  it("carries both when both are on", () => {
    expect(partsListQueryParams("tuba", "Tuba")).toEqual([
      "search=tuba",
      "group=Tuba",
    ]);
  });
});

describe("readPartsListQuery", () => {
  it("reads a view back out of the URL", () => {
    const params = new URLSearchParams("search=eb%20bass&group=Tuba");
    expect(readPartsListQuery(params, GROUPS)).toEqual({
      searchTerm: "eb bass",
      selectedGroup: "Tuba",
    });
  });

  it("reads an empty URL as the unfiltered list", () => {
    expect(readPartsListQuery(new URLSearchParams(), GROUPS)).toEqual({
      searchTerm: "",
      selectedGroup: "",
    });
  });

  it("keeps the no-group filter, which is not one of the group names", () => {
    const params = new URLSearchParams(`group=${NO_GROUP_FILTER}`);
    expect(readPartsListQuery(params, GROUPS).selectedGroup).toBe(
      NO_GROUP_FILTER,
    );
  });

  /**
   * A group that doesn't exist would match no part at all, so the catalogue
   * would read as empty. Falling back to no filter shows the list instead.
   */
  it("ignores a group the backend doesn't have", () => {
    const params = new URLSearchParams("group=Blokkflÿte");
    expect(readPartsListQuery(params, GROUPS).selectedGroup).toBe("");
  });

  it("keeps the search term even when the group is discarded", () => {
    const params = new URLSearchParams("search=tuba&group=Nonsense");
    expect(readPartsListQuery(params, GROUPS)).toEqual({
      searchTerm: "tuba",
      selectedGroup: "",
    });
  });
});

describe("partsListHref", () => {
  it("returns the bare list when nothing was passed along", () => {
    expect(partsListHref(null)).toBe("/parts");
    expect(partsListHref("")).toBe("/parts");
  });

  it("rebuilds the filtered list from the query it was handed", () => {
    expect(partsListHref("search=eb&group=Tuba")).toBe(
      "/parts?search=eb&group=Tuba",
    );
  });

  it("tolerates a leading question mark", () => {
    expect(partsListHref("?search=eb")).toBe("/parts?search=eb");
  });

  /** The value is only ever a query string, so it cannot send the reader elsewhere. */
  it("cannot be used to point at another path", () => {
    expect(partsListHref("//example.com")).toBe("/parts?//example.com");
    expect(partsListHref("/anywhere")).toBe("/parts?/anywhere");
  });
});
