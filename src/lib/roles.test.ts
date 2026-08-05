import { describe, expect, it } from "vitest";
import {
  ROLES,
  capabilitiesFrom,
  holdsAnyRole,
  primaryRoleLabel,
  type Role,
} from "./roles";

/**
 * `capabilitiesFrom` is what decides which catalogue and download controls the
 * UI offers, so these cases are the authorization contract as the frontend sees
 * it — the same one `CatalogAccessService` enforces on the API.
 */
describe("capabilitiesFrom", () => {
  it("gives a Musikant catalog access, but not the whole library", () => {
    const capabilities = capabilitiesFrom(["Musikant"]);

    expect(capabilities.canAccessCatalog).toBe(true);
    expect(capabilities.canReadLibrary).toBe(false);
    expect(capabilities.canManageMusic).toBe(false);
    expect(capabilities.canManageProjects).toBe(false);
    expect(capabilities.isAdmin).toBe(false);
  });

  it("gives an Arkivleser the whole library, but no edit rights", () => {
    const capabilities = capabilitiesFrom(["Arkivleser"]);

    expect(capabilities.canAccessCatalog).toBe(true);
    expect(capabilities.canReadLibrary).toBe(true);
    expect(capabilities.canManageMusic).toBe(false);
    expect(capabilities.canManageProjects).toBe(false);
    expect(capabilities.isAdmin).toBe(false);
  });

  it("adds the roles up — Musikant plus Arkivleser reads the whole library", () => {
    expect(capabilitiesFrom(["Musikant", "Arkivleser"])).toEqual(
      capabilitiesFrom(["Arkivleser"]),
    );
  });

  it("gives Noteansvarlig and Admin the library along with their edit rights", () => {
    expect(capabilitiesFrom(["Noteansvarlig"])).toEqual({
      isAdmin: false,
      canManageMusic: true,
      canManageProjects: true,
      canReadLibrary: true,
      canAccessCatalog: true,
    });
    expect(capabilitiesFrom(["Admin"])).toEqual({
      isAdmin: true,
      canManageMusic: true,
      canManageProjects: true,
      canReadLibrary: true,
      canAccessCatalog: true,
    });
  });

  it("leaves a Prosjektleder without catalog access", () => {
    const capabilities = capabilitiesFrom(["Prosjektleder"]);

    expect(capabilities.canManageProjects).toBe(true);
    expect(capabilities.canAccessCatalog).toBe(false);
    expect(capabilities.canReadLibrary).toBe(false);
  });

  it("offers nothing to a user with no roles", () => {
    expect(capabilitiesFrom([])).toEqual({
      isAdmin: false,
      canManageMusic: false,
      canManageProjects: false,
      canReadLibrary: false,
      canAccessCatalog: false,
    });
  });

  // The API's role names are matched casefolded, so a differently-cased name
  // coming back from `/users/me` must not silently strip a user's access.
  it("matches role names regardless of case", () => {
    expect(capabilitiesFrom(["arkivleser"]).canReadLibrary).toBe(true);
    expect(capabilitiesFrom(["ADMIN"]).isAdmin).toBe(true);
  });

  it("ignores role names it doesn't know", () => {
    expect(capabilitiesFrom(["Dirigent"])).toEqual(capabilitiesFrom([]));
  });
});

describe("ROLES", () => {
  // The picker lists them in this order, widening from a plain reader to a full
  // administrator.
  it("lists every assignable role the API recognises", () => {
    expect([...ROLES]).toEqual([
      "Musikant",
      "Arkivleser",
      "Prosjektleder",
      "Noteansvarlig",
      "Admin",
    ]);
  });

  it("grants each role at least one capability", () => {
    for (const role of ROLES) {
      expect(
        Object.values(capabilitiesFrom([role])).some(Boolean),
        `${role} grants nothing`,
      ).toBe(true);
    }
  });
});

// The account menu's role tag — this is the exact bug a Noteansvarlig hit: it
// used to check `isAdmin` alone, so every other role read as "Medlem".
describe("primaryRoleLabel", () => {
  it("names Administrator over anything else held", () => {
    expect(primaryRoleLabel(capabilitiesFrom(["Admin", "Musikant"]))).toBe(
      "Administrator",
    );
  });

  it("names Noteansvarlig — the bug report's exact case", () => {
    expect(primaryRoleLabel(capabilitiesFrom(["Noteansvarlig"]))).toBe(
      "Noteansvarlig",
    );
  });

  it("prefers Noteansvarlig over a Musikant grant held alongside it", () => {
    expect(
      primaryRoleLabel(capabilitiesFrom(["Musikant", "Noteansvarlig"])),
    ).toBe("Noteansvarlig");
  });

  it("names Prosjektleder for a project manager with no catalogue rights", () => {
    expect(primaryRoleLabel(capabilitiesFrom(["Prosjektleder"]))).toBe(
      "Prosjektleder",
    );
  });

  it("names Arkivleser for a plain library reader", () => {
    expect(primaryRoleLabel(capabilitiesFrom(["Arkivleser"]))).toBe(
      "Arkivleser",
    );
  });

  it("names Musikant when that is the only role held", () => {
    expect(primaryRoleLabel(capabilitiesFrom(["Musikant"]))).toBe("Musikant");
  });

  it("falls back to Medlem for a user with none of the five roles", () => {
    expect(primaryRoleLabel(capabilitiesFrom([]))).toBe("Medlem");
  });
});

describe("holdsAnyRole", () => {
  const allowed: readonly Role[] = ["Arkivleser", "Admin"];

  it("is true as soon as one of the allowed roles is held", () => {
    expect(holdsAnyRole(["Musikant", "Arkivleser"], allowed)).toBe(true);
  });

  it("is false when none is", () => {
    expect(holdsAnyRole(["Musikant", "Prosjektleder"], allowed)).toBe(false);
  });
});
