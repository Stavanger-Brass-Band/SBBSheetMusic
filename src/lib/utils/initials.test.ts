import { describe, expect, it } from "vitest";
import { initialsFrom } from "./initials";

describe("initialsFrom", () => {
  it("takes the first letter of the first and last word", () => {
    expect(initialsFrom("Anders Haugen")).toBe("AH");
  });

  it("ignores middle names", () => {
    expect(initialsFrom("Anders Bjørn Haugen")).toBe("AH");
  });

  it("uppercases lower-case names", () => {
    expect(initialsFrom("anders haugen")).toBe("AH");
  });

  it("falls back to a single letter for a one-word name", () => {
    expect(initialsFrom("Madonna")).toBe("M");
  });

  it("collapses repeated whitespace", () => {
    expect(initialsFrom("  Anders   Haugen  ")).toBe("AH");
  });

  it("is empty for a blank or missing name", () => {
    expect(initialsFrom("")).toBe("");
    expect(initialsFrom("   ")).toBe("");
    expect(initialsFrom(null)).toBe("");
    expect(initialsFrom(undefined)).toBe("");
  });
});
