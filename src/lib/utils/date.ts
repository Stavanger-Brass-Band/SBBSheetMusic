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
 * Noon-UTC ISO string for persisting project dates, avoiding timezone
 * day-shifts. Replaces `moment(x).hour(12).utc().format()`.
 */
export function toApiDate(date: DateInput): string {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

/** `YYYY-MM-DDTHH:MM:SSZ` — the milliseconds only clutter a date filter. */
function toIsoSeconds(date: Date): string {
  return `${date.toISOString().slice(0, 19)}Z`;
}

/**
 * The bounds of the local day as UTC instants, for the server-side `$filter`
 * on `/projects`. Project dates are stored at noon UTC (see `toApiDate`), so a
 * filter only reproduces the day-granularity comparisons `projectStatus` makes
 * if it compares against the *edges* of today rather than against "now" —
 * otherwise a project that starts or ends today falls on the wrong side of it.
 */
export function startOfTodayIso(now: Date = new Date()): string {
  return toIsoSeconds(startOfDay(now));
}

export function endOfTodayIso(now: Date = new Date()): string {
  const end = startOfDay(now);
  end.setHours(23, 59, 59, 0);
  return toIsoSeconds(end);
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
