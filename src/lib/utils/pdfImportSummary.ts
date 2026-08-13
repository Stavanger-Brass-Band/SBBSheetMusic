/**
 * Working out what a combined-PDF import actually did.
 *
 * The import answers with no account of itself — not the pages it grouped, not
 * how sure the OCR was, not the headers it gave up on — so the only way to tell
 * is to compare the set with how it looked beforehand. Both halves of that
 * comparison are the same shape: entries the set didn't have before.
 */

/**
 * What the API parks pages under when it couldn't read their header at all. It
 * is a marker, not a part name — it means those pages were dropped rather than
 * stored, so it has to be said in words rather than listed as if it were a
 * stemme someone could go and look for.
 */
export const UNREADABLE_HEADER_MARKER = "UNRECOGNIZED";

/**
 * The set's unresolved-part note split into entries. The API keeps it as one
 * comma-separated string, and the import appends to the very field a person
 * writes their own notes in, so the two are only tellable apart by comparing.
 */
export function splitMissingParts(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

/**
 * The entries of `after` that weren't already in `before`, in the order `after`
 * has them and without repeats.
 *
 * Compared casefolded, the way the API itself dedupes the unresolved list — a
 * header that comes back differently cased is the same header, and reporting it
 * as newly added would credit the import with something already there. Repeats
 * are dropped because a set can hold several entries under one part name.
 */
export function addedEntries(before: string[], after: string[]): string[] {
  const seen = new Set(before.map((entry) => entry.toLowerCase()));
  const added: string[] = [];

  for (const entry of after) {
    if (entry === "") continue;
    const key = entry.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    added.push(entry);
  }

  return added;
}

/**
 * Sorts the import's unresolved entries into the two different things they mean.
 *
 * A header the API read but couldn't place is a name worth showing — someone can
 * recognise "Flugel Horn" and add the alias. `UNRECOGNIZED` is not that: it says
 * pages went by with no readable header at all and were left out of the set
 * entirely, which is the one outcome a reader has to be told in words. This is
 * the case a partitur lands in, its top margin carrying a title or nothing where
 * a part's carries the instrument.
 */
export function classifyUnresolved(entries: string[]): {
  headerTexts: string[];
  hadUnreadablePages: boolean;
} {
  const isMarker = (entry: string) =>
    entry.toUpperCase() === UNREADABLE_HEADER_MARKER;

  return {
    headerTexts: entries.filter((entry) => !isMarker(entry)),
    hadUnreadablePages: entries.some(isMarker),
  };
}
