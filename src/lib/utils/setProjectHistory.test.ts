import { describe, expect, it } from "vitest";
import { formatUsagePeriod, toSetProjectHistory } from "./setProjectHistory";

describe("toSetProjectHistory", () => {
  it("takes the name and dates straight off the expanded summary", () => {
    const history = toSetProjectHistory([
      {
        id: "p1",
        name: "Julekonsert",
        startDate: "2025-12-12T12:00:00Z",
        endDate: "2025-12-14T12:00:00Z",
      },
    ]);

    expect(history).toEqual([
      {
        id: "p1",
        name: "Julekonsert",
        startDate: "2025-12-12T12:00:00Z",
        endDate: "2025-12-14T12:00:00Z",
      },
    ]);
  });

  it("orders the projects most recent first", () => {
    const history = toSetProjectHistory([
      { id: "old", name: "NM 2019", startDate: "2019-02-01T12:00:00Z" },
      { id: "new", name: "NM 2026", startDate: "2026-02-01T12:00:00Z" },
      { id: "middle", name: "NM 2022", startDate: "2022-02-01T12:00:00Z" },
    ]);

    expect(history.map((usage) => usage.id)).toEqual(["new", "middle", "old"]);
  });

  /**
   * Every field of a summary is optional, so a project whose own dates were
   * never set still has to land somewhere — in the list, at the bottom, rather
   * than dropped or jumping the timeline.
   */
  it("keeps a project with no dates, and puts it last", () => {
    const history = toSetProjectHistory([
      { id: "dated", name: "Vårkonsert", startDate: "2025-04-05T12:00:00Z" },
      { id: "undated", name: "Sommerturné" },
    ]);

    expect(history.map((usage) => usage.id)).toEqual(["dated", "undated"]);
    expect(history[1]).toEqual({
      id: "undated",
      name: "Sommerturné",
      startDate: undefined,
      endDate: undefined,
    });
  });

  it("orders projects sharing a start date, and undated ones, by name", () => {
    const history = toSetProjectHistory([
      { id: "b", name: "Bykonsert", startDate: "2025-05-01T12:00:00Z" },
      { id: "a", name: "Aftenkonsert", startDate: "2025-05-01T12:00:00Z" },
      { id: "z", name: "Ukjent turné" },
      { id: "y", name: "Annen ukjent" },
    ]);

    expect(history.map((usage) => usage.id)).toEqual(["a", "b", "y", "z"]);
  });

  it("drops a summary with no id, which nothing can be linked to", () => {
    expect(toSetProjectHistory([{ name: "Uten id" }])).toEqual([]);
  });
});

describe("formatUsagePeriod", () => {
  it("shows a from–to range", () => {
    expect(
      formatUsagePeriod({
        id: "p1",
        name: "Julekonsert",
        startDate: "2025-12-12T12:00:00Z",
        endDate: "2025-12-14T12:00:00Z",
      }),
    ).toBe("12.12.25 – 14.12.25");
  });

  it("shows a one-day project as a single date", () => {
    expect(
      formatUsagePeriod({
        id: "p1",
        name: "Sommeravslutning",
        startDate: "2025-06-07T12:00:00Z",
        endDate: "2025-06-07T12:00:00Z",
      }),
    ).toBe("07.06.25");
  });

  it("shows the single date a half-dated project has", () => {
    expect(
      formatUsagePeriod({
        id: "p1",
        name: "Uten sluttdato",
        startDate: "2025-06-07T12:00:00Z",
      }),
    ).toBe("07.06.25");
  });

  it("says so when there is no date at all", () => {
    expect(formatUsagePeriod({ id: "p1", name: "Ukjent" })).toBe("Ukjent dato");
  });
});
