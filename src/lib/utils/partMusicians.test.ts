import { describe, expect, it } from "vitest";
import type { User } from "$lib/types";
import { musiciansByPartId } from "./partMusicians";

function user(
  id: string,
  name: string,
  partIds: string[],
  inactive = false,
): User {
  return {
    id,
    name,
    email: `${id}@sbb`,
    inactive,
    parts: partIds.map((partId) => ({ id: partId })),
  };
}

describe("musiciansByPartId", () => {
  it("groups the users playing each part", () => {
    const grouped = musiciansByPartId([
      user("1", "Anders", ["solo"]),
      user("2", "Berit", ["solo"]),
      user("3", "Cato", ["tuba"]),
    ]);

    expect(grouped.get("solo")?.map((found) => found.name)).toEqual([
      "Anders",
      "Berit",
    ]);
    expect(grouped.get("tuba")?.map((found) => found.name)).toEqual(["Cato"]);
  });

  it("lists a user under every part they play", () => {
    const grouped = musiciansByPartId([user("1", "Anders", ["solo", "tuba"])]);

    expect(grouped.get("solo")?.map((found) => found.id)).toEqual(["1"]);
    expect(grouped.get("tuba")?.map((found) => found.id)).toEqual(["1"]);
  });

  it("sorts each part's musicians by name", () => {
    const grouped = musiciansByPartId([
      user("1", "Øyvind", ["solo"]),
      user("2", "Anders", ["solo"]),
      user("3", "Ådne", ["solo"]),
    ]);

    // Å sorts after Ø in Norwegian, which a plain code-point compare gets wrong.
    expect(grouped.get("solo")?.map((found) => found.name)).toEqual([
      "Anders",
      "Øyvind",
      "Ådne",
    ]);
  });

  it("keeps inactive users, who still hold the assignment", () => {
    const grouped = musiciansByPartId([
      user("1", "Anders", ["solo"], true),
      user("2", "Berit", ["solo"]),
    ]);

    expect(grouped.get("solo")).toHaveLength(2);
  });

  it("has no entry for a part nobody plays", () => {
    const grouped = musiciansByPartId([user("1", "Anders", ["solo"])]);

    expect(grouped.get("tuba")).toBeUndefined();
  });

  it("ignores users with no parts, and parts with no id", () => {
    const grouped = musiciansByPartId([
      { id: "1", name: "Anders", email: null, inactive: false },
      { id: "2", name: "Berit", email: null, inactive: false, parts: [] },
      { id: "3", name: "Cato", email: null, inactive: false, parts: [{}] },
    ]);

    expect(grouped.size).toBe(0);
  });

  it("is empty for no users", () => {
    expect(musiciansByPartId([]).size).toBe(0);
  });
});
