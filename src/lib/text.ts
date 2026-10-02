export function toTitleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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
