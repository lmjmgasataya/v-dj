export const SERVICE_BUCKETS = ["9AM & 11AM", "2PM & 4PM", "6PM", "10AM & 1PM"] as const;
export type VgServiceBucket = (typeof SERVICE_BUCKETS)[number];

const SERVICE_TO_BUCKET: Record<string, VgServiceBucket> = {
  "9AM - Mandurriao": "9AM & 11AM",
  "11AM - Mandurriao": "9AM & 11AM",
  "2PM - Mandurriao": "2PM & 4PM",
  "4PM - Mandurriao": "2PM & 4PM",
  "6PM - Mandurriao": "6PM",
  "10AM - Lapaz": "10AM & 1PM",
  "1PM - Lapaz": "10AM & 1PM",
};

export function serviceToBucket(serviceAttending: string | null): VgServiceBucket | null {
  if (!serviceAttending) return null;
  return SERVICE_TO_BUCKET[serviceAttending] ?? null;
}

export type VgBucketCounts = {
  vgLeaders: number;
  victoryGroups: number;
  interns: number;
  leadershipGroups: number;
};

import { areSimilarNames } from "@/lib/vgLeaderMatch";

// Ids are victory_group_leaders / victory_groups ids. Snapshots built from an outside
// source (see formSnapshot.ts) use negative ids for people/groups with no record here.
export type VgLeaderRef = { id: number; name: string };
// `key` identifies the same group across snapshots when ids can't (a form-built snapshot
// has no group ids): "<leader id>|<meeting day>". Absent on snapshots saved before it existed.
export type VgGroupRef = { id: number; label: string; key?: string };

export type VgBucketDetail = {
  vgLeaders: VgLeaderRef[];
  victoryGroups: VgGroupRef[];
  interns: string[];
  leadershipGroups: VgLeaderRef[];
};

/** One Victory Group as the quarterly-update form lists it, frozen in the snapshot. */
export type SnapshotGroupRow = {
  lifestage: string;
  interns: string;
  day: string;
  time: string;
  venue: string;
};

/**
 * One leader's answers, frozen at snapshot time — the same information as a row of the
 * quarterly-update form, so the snapshot can be exported in that layout. Values are
 * display-ready strings; `timestamp` is set only for form-built snapshots.
 */
export type SnapshotLeaderRow = {
  id: number;
  timestamp?: string;
  startedLeading: string;
  lastName: string;
  firstName: string;
  nickname: string;
  mobileNumber: string;
  facebook: string;
  gender: string;
  age: string;
  lifestage: string;
  service: string;
  discipleshipJourney: string;
  leadership113: string;
  ownVgLeader: string;
  isLeadershipGroupLeader: boolean;
  leadershipGroupMembers: string;
  groups: SnapshotGroupRow[];
};

export type VgSnapshotData = {
  byService: Record<VgServiceBucket, VgBucketCounts>;
  totals: VgBucketCounts;
  vglByGender: Record<VgServiceBucket, { male: number; female: number }>;
  genderTotals: { male: number; female: number };
  goals: { vgLeaders: number; leadershipGroups: number };
  // Omitted on snapshots saved before drill-down existed, and on manually-entered
  // snapshots (no underlying leader/group records to list) — always optional.
  detailsByService?: Record<VgServiceBucket, VgBucketDetail>;
  totalsDetail?: VgBucketDetail;
  // Freezes, at snapshot-save time, which claimed VG leaders had (not) updated their
  // profile for the then-live quarter. Omitted on snapshots saved before this existed
  // and on manually-entered snapshots — there's no historical record for past quarters.
  quarterlyUpdateStatus?: {
    quarterKey: string;
    quarterLabel: string;
    done: VgLeaderRef[];
    notDone: VgLeaderRef[];
  };
  // Per-leader answers for the Excel export (see SnapshotLeaderRow). Omitted on snapshots
  // saved before it existed and on manually-entered ones.
  leaderRows?: SnapshotLeaderRow[];
  // Set only by the unattended quarter-end cron job. Editing overrides numbers by hand and
  // drops detail (see updateVgReportSnapshot), which would destroy the frozen historical
  // record the cron exists to produce — so cron-made snapshots can't be edited, only deleted.
  // "form": built from an outside quarterly-update export (e.g. the Q2 2026 Google Form) by
  // src/db/snapshot-from-form.ts. Same reason as cron — editing would drop the name lists.
  source?: "cron" | "form";
};

/** Matching key for a Victory Group across snapshots — see VgGroupRef.key. */
export function victoryGroupKey(vgLeaderId: number, day: string): string {
  return `${vgLeaderId}|${day.trim().toLowerCase()}`;
}

/**
 * Matching key for an intern name across snapshots, ignoring word order, case, accents and
 * punctuation — "Martizano, Chynni Ann" and "Chynni Ann Martizano" are the same person.
 */
export function internKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

// Lowercase words that belong to the last name when they come right before it ("Dela Cruz").
const SURNAME_PARTICLES = new Set(["de", "del", "dela", "la", "las", "delos", "los", "san", "sta", "santa", "sto", "santo", "van", "von"]);
const NAME_SUFFIX = /^(jr|sr|ii|iii|iv)\.?$/i;

/**
 * Display an intern name as "Last, First" so lists sort by last name. Form-built snapshots
 * have free-text names ("Christine Anne De La Cruz"); the last word plus any surname particles
 * before it is taken as the last name ("De La Cruz, Christine Anne"), and a trailing Jr/Sr/II
 * stays with the first name. Names that already have a comma, or are one word, are unchanged.
 */
export function internLastNameFirst(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.includes(",")) return trimmed;
  const words = trimmed.split(" ");
  const suffix = words.length > 2 && NAME_SUFFIX.test(words[words.length - 1]) ? words.pop()! : null;
  if (words.length < 2) return trimmed;
  let start = words.length - 1;
  while (start > 1 && SURNAME_PARTICLES.has(words[start - 1].toLowerCase())) start--;
  const first = [...words.slice(0, start), ...(suffix ? [suffix] : [])].join(" ");
  return `${words.slice(start).join(" ")}, ${first}`;
}

/** One name behind a quarterly-report number, with the service it counts under. */
export type DrillItem = { label: string; service: string };

/** A DrillItem plus what identifies it across snapshots (see snapshotItems). */
export type MatchItem = DrillItem & { match: string | null; idMatch: string };

/**
 * The names behind one metric of a snapshot — for one service bucket, or all of them when
 * `bucket` is null — each with a service: the leader's exact service (e.g. "11AM - Mandurriao")
 * when the snapshot froze per-leader rows, else the bucket ("9AM & 11AM"). Interns aren't tied
 * to a leader record, so they always get the bucket. Null when the snapshot has no name lists.
 */
export function snapshotItems(
  data: VgSnapshotData,
  bucket: VgServiceBucket | null,
  key: keyof VgBucketCounts,
): MatchItem[] | null {
  if (!data.detailsByService) return null;
  const exactService = new Map((data.leaderRows ?? []).map((r) => [r.id, r.service]));
  const serviceOf = (leaderId: number | null, b: VgServiceBucket) =>
    (leaderId != null ? exactService.get(leaderId) : undefined) || b;

  const buckets = bucket ? [bucket] : SERVICE_BUCKETS;
  return buckets.flatMap((b): MatchItem[] => {
    const d = data.detailsByService![b];
    if (key === "interns") {
      return d.interns.map((n) => ({ label: internLastNameFirst(n), service: b, match: internKey(n), idMatch: internKey(n) }));
    }
    if (key === "victoryGroups") {
      return d.victoryGroups.map((g) => {
        const leaderId = g.key ? Number(g.key.split("|")[0]) : null;
        return { label: g.label, service: serviceOf(leaderId, b), match: g.key ?? null, idMatch: `id:${g.id}` };
      });
    }
    const refs = key === "leadershipGroups" ? d.leadershipGroups : d.vgLeaders;
    return refs.map((r) => ({ label: r.name, service: serviceOf(r.id, b), match: `id:${r.id}`, idMatch: `id:${r.id}` }));
  });
}

/**
 * Who was added / removed between two snapshots for one metric (items from snapshotItems),
 * and who is in both (`kept`, as listed in the latest snapshot).
 * Leaders match by id; Victory Groups by `key` when both sides have one (else by id, for older
 * snapshots); interns by internKey. Counted as multisets, so a name listed twice (an intern in
 * two groups) only cancels out against two listings on the other side. Null when either side
 * has no name lists.
 */
export function diffSnapshotItems(
  latest: MatchItem[] | null,
  prev: MatchItem[] | null,
  key: keyof VgBucketCounts,
): { added: DrillItem[]; removed: DrillItem[]; kept: DrillItem[] } | null {
  if (!latest || !prev) return null;
  const useKeys = [...latest, ...prev].every((i) => i.match != null);
  const matchOf = (i: MatchItem) => (useKeys ? i.match! : i.idMatch);

  // Splits one side into items matched by an item on the other side (each one used at most
  // once) and items beyond how many times the same match appears there.
  function split(side: MatchItem[], other: MatchItem[]): { matched: DrillItem[]; unmatched: DrillItem[] } {
    const remaining = new Map<string, number>();
    for (const o of other) remaining.set(matchOf(o), (remaining.get(matchOf(o)) ?? 0) + 1);
    const matched: DrillItem[] = [];
    const unmatched: DrillItem[] = [];
    for (const item of side) {
      const n = remaining.get(matchOf(item)) ?? 0;
      const out = { label: item.label, service: item.service };
      if (n > 0) {
        remaining.set(matchOf(item), n - 1);
        matched.push(out);
      } else unmatched.push(out);
    }
    return { matched, unmatched };
  }

  const latestSplit = split(latest, prev);
  const kept = latestSplit.matched;
  let added = latestSplit.unmatched;
  let removed = split(prev, latest).unmatched;

  // The same person under two leader records (a duplicate not merged yet) would otherwise show
  // as both added and removed — pair those off by near-identical name ("Last, First").
  if (key === "vgLeaders" || key === "leadershipGroups") {
    const asName = (label: string) => {
      const [lastName, ...rest] = label.split(",");
      return { lastName: lastName.trim(), firstName: rest.join(",").trim() };
    };
    const stillRemoved = [...removed];
    added = added.filter((a) => {
      const i = stillRemoved.findIndex((r) => areSimilarNames(asName(a.label), asName(r.label)));
      if (i === -1) return true;
      stillRemoved.splice(i, 1);
      kept.push(a);
      return false;
    });
    removed = stillRemoved;
  }

  return { added, removed, kept };
}

export function emptyBucketDetail(): VgBucketDetail {
  return { vgLeaders: [], victoryGroups: [], interns: [], leadershipGroups: [] };
}

export function emptyBucketCounts(): VgBucketCounts {
  return { vgLeaders: 0, victoryGroups: 0, interns: 0, leadershipGroups: 0 };
}
