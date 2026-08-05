/**
 * Where opening a set from the archive list leads: the editor for anyone who
 * may change it, the read-only view (parts, downloads, no edit controls) for a
 * library reader who may only browse, and nowhere for a Musikant — who reaches
 * a set through its active project (`/project/[projectId]/set/[id]`) instead.
 */
export interface SetRouteCapabilities {
  canManageMusic: boolean;
  canReadLibrary: boolean;
}

export function setRouteFor(
  setId: string,
  capabilities: SetRouteCapabilities,
): string | null {
  if (capabilities.canManageMusic) return `/set/edit/${setId}`;
  if (capabilities.canReadLibrary) return `/set/${setId}`;
  return null;
}
