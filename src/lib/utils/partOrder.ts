import type { Part } from "$lib/types";

/**
 * The parts catalogue's own ordering: `sortOrder` first — the rank the catalogue
 * is maintained in, which follows the standard brass band section order — then
 * name, so parts sharing a rank still land somewhere stable rather than wherever
 * the server happened to return them.
 */
export function byCatalogOrder(first: Part, second: Part): number {
  return (
    (first.sortOrder ?? 0) - (second.sortOrder ?? 0) ||
    (first.name ?? "").localeCompare(second.name ?? "", "nb-NO")
  );
}
