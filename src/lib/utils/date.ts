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
/** The API leaves every date optional, so the formatters take nothing too. */
type OptionalDateInput = DateInput | null | undefined;

/** Stands in for a date the API left unset, rather than "Invalid Date". */
const NO_DATE = "—";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** `{ day, monthShort }` for the DateRangeBoxes boxes (e.g. `07`, `jun`). */
export function formatDayMonth(date: OptionalDateInput): {
  day: string;
  monthShort: string;
} {
  if (date === null || date === undefined) {
    return { day: NO_DATE, monthShort: "" };
  }
  const d = new Date(date);
  return {
    day: dayFmt.format(d),
    // Norwegian short month includes a trailing period ("jun.") — drop it to
    // match the previous moment "MMM" output.
    monthShort: monthShortFmt.format(d).replace(".", ""),
  };
}

/** `DD.MM.YYYY` (e.g. `07.06.2026`). */
export function formatDmy(date: OptionalDateInput): string {
  if (date === null || date === undefined) return NO_DATE;
  return dmyFmt.format(new Date(date));
}

/**
 * Sortable timestamp for a possibly-unset API date. A missing or unparseable
 * date collapses to 0 so it sorts to one end instead of poisoning every
 * comparison it takes part in with `NaN`.
 */
export function dateSortValue(date: OptionalDateInput): number {
  if (date === null || date === undefined) return 0;
  const value = new Date(date).valueOf();
  return Number.isNaN(value) ? 0 : value;
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

/** A project's lifecycle phase relative to today. */
export type ProjectStatus = "upcoming" | "active" | "ended";

/**
 * Classify a project as not-yet-started / ongoing / finished relative to `now`
 * (day granularity), so the UI can show a status instead of making the reader
 * compare the from/to dates themselves.
 */
export function projectStatus(
  project: { startDate?: string | null; endDate?: string | null },
  now: Date = new Date(),
): ProjectStatus {
  const today = startOfDay(now);
  if (project.startDate && startOfDay(new Date(project.startDate)) > today) {
    return "upcoming";
  }
  if (project.endDate && startOfDay(new Date(project.endDate)) < today) {
    return "ended";
  }
  return "active";
}
