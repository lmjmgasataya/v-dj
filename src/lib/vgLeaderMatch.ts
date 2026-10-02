/**
 * Fuzzy-ish matching of externally collected names/numbers (e.g. a Google Form export)
 * to victoryGroupLeaders rows. Mobile number wins; name is the fallback.
 */

/** Last 10 digits (9XXXXXXXXX) so 09…, 639…, +639… and 9… all compare equal; null if too short or not a PH mobile. */
export function phoneKey(raw: string | null | undefined): string | null {
  const d = (raw ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  const key = d.slice(-10);
  return key.startsWith("9") ? key : null;
}

/** Lowercase, accents stripped (ñ -> n), punctuation dropped, whitespace collapsed. */
export function normalizeName(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Common abbreviations normalized before comparing first names ("Ma. Lorena" = "Maria Lorena").
const FIRST_NAME_ALIASES: Record<string, string> = { ma: "maria" };

function firstNameWords(firstName: string): string[] {
  return normalizeName(firstName)
    .split(" ")
    .filter(Boolean)
    .map((w) => FIRST_NAME_ALIASES[w] ?? w);
}

/**
 * Same person entered twice with a slightly different name: same last name, and the
 * first names have the same words in any order ("John Mark" / "Mark John"), or one's
 * words are all contained in the other's ("Kent" / "Kent Cedrix", "Rodolfo" / "Rodolfo Jr").
 * Accents, dots, casing and spacing are ignored. Exact matches count as similar too.
 */
export function areSimilarNames(
  a: { lastName: string; firstName: string },
  b: { lastName: string; firstName: string },
): boolean {
  if (normalizeName(a.lastName) !== normalizeName(b.lastName)) return false;
  const wa = new Set(firstNameWords(a.firstName));
  const wb = new Set(firstNameWords(b.firstName));
  if (wa.size === 0 || wb.size === 0) return false;
  const [small, large] = wa.size <= wb.size ? [wa, wb] : [wb, wa];
  return [...small].every((w) => large.has(w));
}

export type MatchMethod = "mobile" | "name" | "name_first_word";

interface Matchable {
  id: number;
  lastName: string;
  firstName: string;
  mobileNumber: string | null;
}

/**
 * Builds a matcher over `leaders`. Tries, in order: same mobile number, same full
 * last + first name, then same last name + first word of the first name (catches
 * "Ma. Erlinda" vs "Erlinda" style drift only when that pairing is unambiguous).
 */
export function createLeaderMatcher<T extends Matchable>(leaders: T[]) {
  const byPhone = new Map<string, T>();
  const byName = new Map<string, T>();
  const byFirstWord = new Map<string, T[]>();

  for (const l of leaders) {
    const p = phoneKey(l.mobileNumber);
    if (p && !byPhone.has(p)) byPhone.set(p, l);
    const last = normalizeName(l.lastName);
    const first = normalizeName(l.firstName);
    const nameKey = `${last}|${first}`;
    if (!byName.has(nameKey)) byName.set(nameKey, l);
    const wordKey = `${last}|${first.split(" ")[0]}`;
    byFirstWord.set(wordKey, [...(byFirstWord.get(wordKey) ?? []), l]);
  }

  return (r: { lastName: string; firstName: string; mobileNumber: string | null }): { leader: T; method: MatchMethod } | null => {
    const p = phoneKey(r.mobileNumber);
    if (p && byPhone.has(p)) return { leader: byPhone.get(p)!, method: "mobile" };
    const last = normalizeName(r.lastName);
    const first = normalizeName(r.firstName);
    const exact = byName.get(`${last}|${first}`);
    if (exact) return { leader: exact, method: "name" };
    const candidates = byFirstWord.get(`${last}|${first.split(" ")[0]}`) ?? [];
    if (candidates.length === 1) return { leader: candidates[0], method: "name_first_word" };
    return null;
  };
}
