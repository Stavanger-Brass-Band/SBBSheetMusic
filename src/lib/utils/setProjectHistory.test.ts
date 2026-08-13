import { describe, expect, it } from "vitest";
import { formatUsagePeriod, toSetProjectHistory } from "./setProjectHistory";
import type { Project } from "$lib/types";

const project = (
  id: string,
  name: string,
  startDate?: string,
  endDate?: string,
): Project => ({ id, name, startDate, endDate });

describe("toSetProjectHistory", () => {
  it("joins the expanded summaries with the dates read off the projects", () => {
    const history = toSetProjectHistory(
      [{ id: "p1", name: "Julekonsert" }],
      [
        project(
          "p1",
          "Julekonsert",
          "2025-12-12T12:00:00Z",
          "2025-12-14T12:00:00Z",
        ),
      ],
    );

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
    const history = toSetProjectHistory(
      [
        { id: "old", name: "NM 2019" },
        { id: "new", name: "NM 2026" },
        { id: "middle", name: "NM 2022" },
      ],
      [
        project("old", "NM 2019", "2019-02-01T12:00:00Z"),
        project("new", "NM 2026", "2026-02-01T12:00:00Z"),
        project("middle", "NM 2022", "2022-02-01T12:00:00Z"),
      ],
    );

    expect(history.map((usage) => usage.id)).toEqual(["new", "middle", "old"]);
  });

  /**
   * The dates come from a second round of requests, so one of them failing must
   * not cost the reader a project the set was genuinely played on.
   */
  it("keeps a project whose details never arrived, without dates and last", () => {
    const history = toSetProjectHistory(
      [
        { id: "known", name: "Vårkonsert" },
        { id: "unreachable", name: "Sommerturné" },
      ],
      [project("known", "Vårkonsert", "2025-04-05T12:00:00Z")],
    );

    expect(history.map((usage) => usage.id)).toEqual(["known", "unreachable"]);
    expect(history[1]).toEqual({
      id: "unreachable",
      name: "Sommerturné",
      startDate: undefined,
      endDate: undefined,
    });
  });

  it("orders projects sharing a start date, and undated ones, by name", () => {
    const history = toSetProjectHistory(
      [
        { id: "b", name: "Bykonsert" },
        { id: "a", name: "Aftenkonsert" },
        { id: "z", name: "Ukjent turné" },
        { id: "y", name: "Annen ukjent" },
      ],
      [
        project("b", "Bykonsert", "2025-05-01T12:00:00Z"),
        project("a", "Aftenkonsert", "2025-05-01T12:00:00Z"),
      ],
    );

    expect(history.map((usage) => usage.id)).toEqual(["a", "b", "y", "z"]);
  });

  it("drops a summary with no id, which nothing can be joined or linked to", () => {
    expect(toSetProjectHistory([{ name: "Uten id" }], [])).toEqual([]);
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
