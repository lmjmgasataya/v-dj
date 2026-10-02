/**
 * "JUAN DELA CRUZ" -> "Juan Dela Cruz", "dima-ala" -> "Dima-Ala", "o'brien" -> "O'Brien".
 * A letter is capitalized at the start of each word and after a hyphen or apostrophe.
 * Unicode-aware, so accented letters don't count as word breaks: "granpeñas" -> "Granpeñas",
 * not "GranpeñAs" (which `\b\w` produced, since `\w` doesn't match "ñ").
 */
export function toTitleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .trim()
    .toLowerCase()
    .replace(/(^|[^\p{L}\p{M}])(\p{L})/gu, (_, before: string, letter: string) => before + letter.toUpperCase());
}

/**
 * Display form of a person's name: each space-separated word lowercased, then its first
 * letter capitalized — "IDEMNE" -> "Idemne", "capirayan" -> "Capirayan", "ma. rena" -> "Ma. Rena".
 * Word-based (unlike toTitleCase's \b) so accented letters don't start a new word:
 * "GRANPEÑAS" -> "Granpeñas", not "GranpeñAs".
 */
export function formatPersonName(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function firstWord(s: string | null | undefined): string {
  return (s ?? "").trim().split(/\s+/)[0] ?? "";
}
