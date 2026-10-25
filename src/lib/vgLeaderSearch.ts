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
  const tokens = normalizeName(q).split(" ").filter(Boolean);
  if (!tokens.length) return [];
  return options
    .filter((o) => {
      if (o.id === excludeId) return false;
      const haystack = normalizeName(`${o.lastName} ${o.firstName} ${o.nickname ?? ""}`);
      return tokens.every((t) => haystack.includes(t));
    })
    .slice(0, MAX_RESULTS);
}
