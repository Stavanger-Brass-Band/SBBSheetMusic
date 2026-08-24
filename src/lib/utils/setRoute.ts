/**
 * Where opening a set leads: the editor for anyone who may change it, the
 * read-only view (parts, downloads, no edit controls) for a library reader who
 * may only browse, and — for a Musikant, who has neither — the set as it sits on
 * one of their projects (`/project/[projectId]/set/[id]`).
 */
export interface SetRouteCapabilities {
  canManageMusic: boolean;
  canReadLibrary: boolean;
}

/**
 * `projectId` is the way in for a Musikant, and only for them: the member
 * hierarchy's set view needs the project it is reached through, so a caller that
 * knows one can offer a set to a reader who could otherwise open nothing. The
 * archive list has no project in hand and passes none, which is why a Musikant's
 * archive row still leads nowhere.
 */
export function setRouteFor(
  setId: string,
  capabilities: SetRouteCapabilities,
  projectId?: string,
): string | null {
  if (capabilities.canManageMusic) return `/set/edit/${setId}`;
  if (capabilities.canReadLibrary) return `/set/${setId}`;
  return projectId ? `/project/${projectId}/set/${setId}` : null;
}

/**
 * Whether a set opens on its own id alone, with no project to reach it through.
 *
 * Quick jump asks before searching, because the answer decides what it has to
 * ask the API for: a reader this is false for — a Musikant — needs
 * `$expand=projects` on the search, since a project id is the only thing that
 * will make their results openable.
 */
export function canOpenSetRoute(capabilities: SetRouteCapabilities): boolean {
  return capabilities.canManageMusic || capabilities.canReadLibrary;
}
