import { normalizeName } from "./vgLeaderMatch";

/** A VG leader as preloaded into the autocompletes (see getVgLeaderOptions). */
export interface VgLeaderOption {
  id: number;
  lastName: string;
  firstName: string;
  nickname: string | null;
  mobileNumber: string | null;
  facebookMessengerName: string | null;
}

const MAX_RESULTS = 10;

/**
 * Client-side filter for the preloaded VG leaders. Every word typed must appear somewhere
 * in the last name, first name or nickname, ignoring case, accents and dots — "penas" finds
 * "Peñas", "anna ma" finds "Ma. Anna".
 */
export function searchVgLeaders(options: VgLeaderOption[], q: string, excludeId?: number): VgLeaderOption[] {
  if (!nameQueryTokens(q).length) return [];
  return options.filter((o) => o.id !== excludeId && matchesNameQuery(o, q)).slice(0, MAX_RESULTS);
}

function nameQueryTokens(q: string): string[] {
  return normalizeName(q).split(" ").filter(Boolean);
}

/**
 * Same rule as searchVgLeaders, for any person with a name: every word typed appears in the
 * last name, first name or nickname, ignoring case, accents and dots. An empty query matches.
 */
export function matchesNameQuery(
  person: { lastName: string; firstName: string; nickname?: string | null },
  q: string
): boolean {
  const tokens = nameQueryTokens(q);
  if (!tokens.length) return true;
  const haystack = normalizeName(`${person.lastName} ${person.firstName} ${person.nickname ?? ""}`);
  return tokens.every((t) => haystack.includes(t));
}
