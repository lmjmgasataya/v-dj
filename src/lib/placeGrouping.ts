// VG places are free text, so the same venue shows up spelled many ways
// ("Coffee Shop" / "Coffee shops", "SM City Food hall" / "SM Foodcourt",
// "Zuri" / "Zuri Hotel, Iloilo City"). These rules fold them into one entry.

// Phrases that mean the same thing; applied before tokenizing.
const SYNONYMS: [RegExp, string][] = [
  [/food\s*(court|hall)/g, "foodhall"],
];

// Words too generic to tell two places apart ("SM City Iloilo" is just "SM").
const GENERIC_WORDS = new Set(["city", "iloilo"]);

function tokens(place: string): string[] {
  let s = place.toLowerCase();
  for (const [re, replacement] of SYNONYMS) s = s.replace(re, replacement);
  return s
    .replace(/(\w)-(\w)/g, "$1$2") // "Miag-ao" -> "miagao"
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !GENERIC_WORDS.has(t))
    .map((t) => (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t)); // "shops" -> "shop"
}

function isPrefix(prefix: string[], of: string[]) {
  return prefix.length <= of.length && prefix.every((t, i) => of[i] === t);
}

// Same trimmed spelling counted once, most used first.
function mergeVariants(members: { place: string; count: number }[]) {
  const byPlace = new Map<string, number>();
  for (const m of members) byPlace.set(m.place, (byPlace.get(m.place) ?? 0) + m.count);
  return Array.from(byPlace.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export interface PlaceGroup {
  label: string;
  count: number;
  variants: { label: string; count: number }[];
}

/**
 * Groups place counts by a normalized key (case, punctuation, spacing, plurals
 * and synonyms ignored), then folds a longer place into a shorter one it starts
 * with ("Zuri Hotel Cafe" -> "Zuri"). Entries naming several places with "/"
 * ("Zuri/SM City") are left on their own.
 */
export function groupPlaces(counts: Map<string, number>): PlaceGroup[] {
  const entries = Array.from(counts.entries()).map(([place, count]) => {
    const multi = place.includes("/");
    const t = tokens(place);
    return { place: place.trim(), count, multi, tokens: t.length ? t : [place.trim().toLowerCase()] };
  });

  // Shortest keys first so they become the roots longer variants fold into.
  entries.sort((a, b) => a.tokens.length - b.tokens.length);

  const roots: { tokens: string[]; multi: boolean; members: { place: string; count: number; tokens: string[] }[] }[] = [];
  for (const e of entries) {
    const root = e.multi
      ? roots.find((r) => r.multi && r.tokens.join(" ") === e.tokens.join(" "))
      : roots.find((r) => !r.multi && isPrefix(r.tokens, e.tokens));
    const member = { place: e.place, count: e.count, tokens: e.tokens };
    if (root) root.members.push(member);
    else roots.push({ tokens: e.tokens, multi: e.multi, members: [member] });
  }

  return roots
    .map((r) => {
      // Label with the root place's own spelling (the most used one, e.g. "SM City"
      // rather than "SM Foodcourt"); the tooltip lists every spelling folded in.
      const rootKey = r.tokens.join(" ");
      const rootSpellings = r.members.filter((m) => m.tokens.join(" ") === rootKey);
      const label = rootSpellings.sort((a, b) => b.count - a.count || a.place.length - b.place.length)[0].place;
      return {
        label,
        count: r.members.reduce((sum, m) => sum + m.count, 0),
        variants: mergeVariants(r.members),
      };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
