/**
 * Avatar initials derived from a display name — the first letter of the first
 * and last word, uppercased. There is no avatar upload, so this is the only
 * avatar content and has to hold up for a blank or single-word name too.
 */
export function initialsFrom(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0][0].toUpperCase();
  return words[0][0].toUpperCase() + words[words.length - 1][0].toUpperCase();
}
