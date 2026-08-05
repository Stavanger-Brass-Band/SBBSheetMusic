import { describe, expect, it } from "vitest";
import { setRouteFor } from "./setRoute";

/**
 * This is the exact rule that broke when Arkivleser shipped without it: the
 * archive list only ever routed a click through `canManageMusic`, so a library
 * reader with no edit rights had no way to open a set at all.
 */
describe("setRouteFor", () => {
  it("opens the editor for someone who may change the set", () => {
    expect(
      setRouteFor("set-1", { canManageMusic: true, canReadLibrary: true }),
    ).toBe("/set/edit/set-1");
  });

  it("opens the read-only view for a library reader with no edit rights", () => {
    expect(
      setRouteFor("set-1", { canManageMusic: false, canReadLibrary: true }),
    ).toBe("/set/set-1");
  });

  it("prefers the editor when both rights are held", () => {
    expect(
      setRouteFor("set-1", { canManageMusic: true, canReadLibrary: true }),
    ).toBe("/set/edit/set-1");
  });

  // A Musikant reaches a set through its active project, not the archive row.
  it("goes nowhere for someone with neither right", () => {
    expect(
      setRouteFor("set-1", { canManageMusic: false, canReadLibrary: false }),
    ).toBeNull();
  });
});
