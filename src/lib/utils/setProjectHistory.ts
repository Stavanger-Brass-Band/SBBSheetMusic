/**
 * A set's usage history: the projects it has been played on, newest first.
 *
 * `$expand=projects` on a set carries everything a row needs — id, name and the
 * project's dates — so the whole history is one response.
 */

import { formatDmyShort } from "$lib/utils/date";
import type { ProjectSummary, SetProjectUsage } from "$lib/types";

/**
 * Order the project summaries a set came back with, newest first.
 *
 * The API leaves every field of a summary optional, so this is also where a row
 * settles into the shape the list renders: a summary without an id is dropped,
 * since it can't be linked to, and the dates stay optional because a project
 * whose own dates were never set has none to carry.
 */
export function toSetProjectHistory(
  summaries: ProjectSummary[],
): SetProjectUsage[] {
  return summaries
    .filter(
      (summary): summary is ProjectSummary & { id: string } => !!summary.id,
    )
    .map((summary) => ({
      id: summary.id,
      name: summary.name ?? "",
      startDate: summary.startDate,
      endDate: summary.endDate,
    }))
    .sort(byMostRecentFirst);
}

/**
 * Most recent first — the order the question behind the list ("when did we last
 * play this?") is asked in. Ties, and the undated rows that can't be placed on
 * the timeline at all, fall back to the project name so the order is at least
 * stable between loads.
 */
function byMostRecentFirst(
  first: SetProjectUsage,
  second: SetProjectUsage,
): number {
  const firstTime = usageTime(first);
  const secondTime = usageTime(second);

  if (firstTime === secondTime)
    return first.name.localeCompare(second.name, "nb");
  // A project with no dates has nothing to place it by, so it sinks to the
  // bottom rather than jumping the queue at either end of the timeline.
  if (firstTime === undefined) return 1;
  if (secondTime === undefined) return -1;
  return secondTime - firstTime;
}

/** When a project ran, for ordering. Its start, or its end if it has no start. */
function usageTime(usage: SetProjectUsage): number | undefined {
  const date = usage.startDate ?? usage.endDate;
  if (!date) return undefined;

  const time = new Date(date).getTime();
  return Number.isNaN(time) ? undefined : time;
}

/**
 * The period a project ran, in the short date form — the row gives it a line
 * under a project name of any length, and a history is read for roughly when
 * rather than for the century. A project that begins and ends on the same day —
 * most concerts — reads as one date rather than the same date twice.
 */
export function formatUsagePeriod(usage: SetProjectUsage): string {
  if (!usage.startDate && !usage.endDate) return "Ukjent dato";
  if (!usage.startDate) return formatDmyShort(usage.endDate);
  if (!usage.endDate) return formatDmyShort(usage.startDate);

  const from = formatDmyShort(usage.startDate);
  const to = formatDmyShort(usage.endDate);
  return from === to ? from : `${from} – ${to}`;
}
