/**
 * The app's navigation, as data rather than markup.
 *
 * It lives here and not in `Header` because two things now need to agree on it:
 * the header's own links, and Quick jump — which offers the same destinations as
 * its standing answer before anything has been typed. A second copy of the
 * role-to-link rules would drift the moment a section is added.
 *
 * Pure on purpose, like `$lib/roles`: it takes capabilities and a pathname and
 * answers with plain data, so the unit tests reach it directly.
 */

import type { Capabilities } from "$lib/roles";

/** One destination in the navigation. */
export interface NavItem {
  /**
   * The section this item stands for. `sectionFor` answers in the same
   * vocabulary, which is how a link knows when it is the current one — including
   * from an editor route that has no link of its own.
   */
  id: string;
  label: string;
  href: string;
}

/**
 * The navigation split the header renders in two: the sections every reader
 * navigates by, and the administrative ones folded behind "Mer".
 *
 * The split is by how often a page is wanted, not by how privileged it is —
 * Prosjekter stays primary because managing projects is a Prosjektleder's whole
 * job, while the stemme catalogue, the categories and the accounts are places
 * you go to set something up and then leave. Keeping the primary row to four
 * links is also what let the header's collapse threshold come down (see
 * `TABLET_WIDTH` in `Header`).
 */
export interface Navigation {
  primary: NavItem[];
  admin: NavItem[];
}

/**
 * The navigation a set of capabilities produces. Every entry is gated on the
 * same flag that guards the page it leads to, so the nav never offers a
 * destination the guard will turn the reader away from.
 */
export function navigationFor(capabilities: Capabilities): Navigation {
  return {
    primary: [
      { id: "home", label: "Hjem", href: "/" },
      // Reading the catalogue — Musikant (active projects only), Arkivleser,
      // Noteansvarlig or Admin. Without one of them the list has nothing in it.
      ...(capabilities.canAccessCatalog
        ? [{ id: "archive", label: "Arkivliste", href: "/archive" }]
        : []),
      // Project admin — Admin, Noteansvarlig or Prosjektleder.
      ...(capabilities.canManageProjects
        ? [{ id: "projects", label: "Prosjekter", href: "/projects" }]
        : []),
      // The roster. No role gates it: `GET /musicians` answers any session, and
      // who plays which stemme is the one thing in the app that belongs to every
      // member equally.
      { id: "roster", label: "Korpset", href: "/roster" },
    ],
    admin: [
      // Music-catalogue admin — Admin or Noteansvarlig.
      ...(capabilities.canManageMusic
        ? [
            { id: "parts", label: "Stemmekatalog", href: "/parts" },
            { id: "categories", label: "Kategorier", href: "/categories" },
          ]
        : []),
      // User administration — Admin only.
      ...(capabilities.isAdmin
        ? [{ id: "users", label: "Brukere", href: "/users" }]
        : []),
    ],
  };
}

/**
 * Which top-level section a path belongs to. The project view and set view live
 * *under* Hjem, so Hjem stays active there. Editing screens belong to their
 * admin section (Prosjekter / Arkivliste / …) — add new editor routes here or
 * the nav loses its active section.
 */
export function sectionFor(pathname: string): string {
  if (pathname.startsWith("/archive") || pathname.startsWith("/set/"))
    return "archive";
  if (pathname.startsWith("/projects") || pathname.startsWith("/project/edit"))
    return "projects";
  if (pathname.startsWith("/users") || pathname.startsWith("/user/edit"))
    return "users";
  if (pathname.startsWith("/parts") || pathname.startsWith("/part/edit"))
    return "parts";
  if (pathname.startsWith("/categories")) return "categories";
  if (pathname.startsWith("/roster")) return "roster";
  return "home"; // "/", "/project/[id]", "/project/[projectId]/set/[id]"
}
