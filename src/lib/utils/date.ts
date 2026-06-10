/**
 * Date formatting helpers using the native Intl API with the Norwegian
 * (`nb-NO`) locale. Replaces moment.js and the hand-written Norwegian locale
 * that used to live in App.svelte.
 */

const LOCALE = "nb-NO";

const dayFmt = new Intl.DateTimeFormat(LOCALE, { day: "2-digit" });
const monthShortFmt = new Intl.DateTimeFormat(LOCALE, { month: "short" });
const dmyFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

type DateInput = string | number | Date;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** `{ day, monthShort }` for the FancyDateView boxes (e.g. `07`, `jun`). */
export function formatDayMonth(date: DateInput): {
  day: string;
  monthShort: string;
} {
  const d = new Date(date);
  return {
    day: dayFmt.format(d),
    // Norwegian short month includes a trailing period ("jun.") — drop it to
    // match the previous moment "MMM" output.
    monthShort: monthShortFmt.format(d).replace(".", ""),
  };
}

/** `DD.MM.YYYY` (e.g. `07.06.2026`). */
export function formatDmy(date: DateInput): string {
  return dmyFmt.format(new Date(date));
}

/**
 * Noon-UTC ISO string for persisting project dates, avoiding timezone
 * day-shifts. Replaces `moment(x).hour(12).utc().format()`.
 */
export function toApiDate(date: DateInput): string {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

/** True when `now` falls within the project's [startDate, endDate] (day granularity). */
export function isActiveProject(
  project: { startDate?: string | null; endDate?: string | null },
  now: Date = new Date(),
): boolean {
  if (!project.startDate || !project.endDate) return false;
  const today = startOfDay(now);
  return (
    startOfDay(new Date(project.startDate)) <= today &&
    startOfDay(new Date(project.endDate)) >= today
  );
}
