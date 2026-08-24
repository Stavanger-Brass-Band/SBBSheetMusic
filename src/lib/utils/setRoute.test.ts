import { describe, expect, it } from "vitest";
import { canOpenSetRoute, setRouteFor } from "./setRoute";

const EDITOR = { canManageMusic: true, canReadLibrary: true };
const READER = { canManageMusic: false, canReadLibrary: true };
const MUSIKANT = { canManageMusic: false, canReadLibrary: false };

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

  it("takes a Musikant through the project when the caller knows one", () => {
    expect(setRouteFor("set-1", MUSIKANT, "project-9")).toBe(
      "/project/project-9/set/set-1",
    );
  });

  /**
   * The project route is the fallback, not a preference: someone who may open the
   * set on its own still does, so the same row means the same page wherever it
   * was clicked from.
   */
  it("ignores the project for a reader who can open the set directly", () => {
    expect(setRouteFor("set-1", { ...READER }, "project-9")).toBe("/set/set-1");
    expect(setRouteFor("set-1", { ...EDITOR }, "project-9")).toBe(
      "/set/edit/set-1",
    );
  });
});

describe("canOpenSetRoute", () => {
  it("agrees with setRouteFor whenever there is no project to route through", () => {
    for (const canManageMusic of [true, false]) {
      for (const canReadLibrary of [true, false]) {
        const capabilities = { canManageMusic, canReadLibrary };

        expect(canOpenSetRoute(capabilities)).toBe(
          setRouteFor("set-1", capabilities) !== null,
        );
      }
    }
  });

  /** False is the signal that a project id has to be fetched alongside the set. */
  it("is false for a Musikant, who needs one", () => {
    expect(canOpenSetRoute(MUSIKANT)).toBe(false);
  });
});
