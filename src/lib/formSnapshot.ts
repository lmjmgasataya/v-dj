/**
 * Builds quarterly-report snapshot data from an outside quarterly-update export — the
 * Discipleship team's Google Form ("Q2 2026 Discipleship Database - Form Responses"), which
 * predates the VG Leader Portal. Same shape and counting rules as computeVgSnapshotCounts, so
 * it can be compared against live data or other snapshots:
 * - VG Leaders: every respondent (answering the form = active that quarter)
 * - Victory Groups: each group they listed (none for "only leading a Leadership Group")
 * - Interns: each person named in a group's intern field
 * - Leadership Group Leaders: respondents who answered "Yes, I am leading..."
 * Respondents are matched to victory_group_leaders by mobile number, then name, so the
 * Change column can tell who was added/removed; unmatched ones get negative ids.
 */
import { formatPersonName } from "@/lib/text";
import { createLeaderMatcher } from "@/lib/vgLeaderMatch";
import {
  SERVICE_BUCKETS,
  serviceToBucket,
  emptyBucketCounts,
  emptyBucketDetail,
  victoryGroupKey,
  type VgServiceBucket,
  type VgBucketCounts,
  type VgBucketDetail,
  type VgSnapshotData,
  type SnapshotLeaderRow,
} from "@/lib/vgSnapshot";

/** Form's "2 PM - MANDURRIAO" / "10 AM - LA PAZ" -> SERVICE_OPTIONS' "2PM - Mandurriao" / "10AM - Lapaz". */
export function normalizeFormService(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})\s*(AM|PM)\s*-\s*(.+)$/i);
  if (!m) return raw.trim() || null;
  const location = m[3].replace(/\s+/g, "").toLowerCase();
  return `${m[1]}${m[2].toUpperCase()} - ${location.charAt(0).toUpperCase()}${location.slice(1)}`;
}

/** Form timestamps are Manila local time, e.g. "4/6/2026 20:47:55". */
export function parseFormTimestamp(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, mo, d, y, h, mi, s] = m;
  const pad = (v: string) => v.padStart(2, "0");
  return new Date(`${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${mi}:${s}+08:00`);
}

const NO_INTERN = /^(none|na|n\s*\/?\s*a|-+|same.*|)$/i;

/**
 * "Mary Jane Labayen/Bella Galvez", "Nitz Caipang and Van Silveo", "Kyla Escala - N/A, ..."
 * -> individual names; "N/A", "None", "-" -> none.
 */
export function splitInternNames(cell: string): string[] {
  return cell
    .replace(/-?\s*\bn\s*\/\s*a\b/gi, "")
    .split(/[,/;]|\s+and\s+/i)
    .map((s) => s.trim())
    .filter((s) => !NO_INTERN.test(s))
    .map(formatPersonName);
}

/** "4:00:00 PM" -> "4:00 PM", matching how victory_groups.time is stored. */
function formatTime(raw: string): string {
  return raw.trim().replace(/^(\d{1,2}:\d{2}):\d{2}/, "$1");
}

function column(header: string[], label: RegExp, required = true): number {
  const i = header.findIndex((h) => label.test(h.trim()));
  if (i === -1 && required) throw new Error(`Column not found: ${label}`);
  return i;
}

export interface FormSnapshotResult {
  data: Pick<
    VgSnapshotData,
    "byService" | "totals" | "vglByGender" | "genderTotals" | "detailsByService" | "totalsDetail" | "leaderRows"
  >;
  respondents: number;
  matched: number;
  /** Respondents whose service didn't map to a report bucket (not counted). */
  skippedNoService: string[];
}

export function buildFormSnapshot(
  rows: string[][],
  leaders: { id: number; lastName: string; firstName: string; mobileNumber: string | null }[],
): FormSnapshotResult {
  const [header, ...body] = rows;
  const col = {
    timestamp: column(header, /^Timestamp$/i),
    lastName: column(header, /^Last Name$/i),
    firstName: column(header, /^First Name/i),
    mobile: column(header, /^Mobile Number$/i),
    gender: column(header, /^Gender$/i),
    service: column(header, /^Service you are serving$/i),
    isLgl: column(header, /^Are you a Leadership Group/i),
    groupCount: column(header, /^How many Victory Groups/i),
    startedLeading: column(header, /^When did you begin leading/i, false),
    nickname: column(header, /^Nick ?Name$/i, false),
    facebook: column(header, /^Facebook\/Messenger Name$/i, false),
    age: column(header, /^Age$/i, false),
    lifestage: column(header, /^Choose your current life stage/i, false),
    journey: column(header, /^Discipleship Journey completed/i, false),
    leadership113: column(header, /^Are you a graduate of Leadership 113/i, false),
    ownVgLeader: column(header, /^Name of your Victory group leader$/i, false),
    lglMembers: column(header, /^If Leadership Group/i, false),
  };
  // A respondent with one group answers the unprefixed columns; with N groups, "Victory Group k of N - ...".
  function groupColumns(n: number, k: number) {
    const prefix = n === 1 ? "" : `Victory Group ${k} of ${n} - `;
    const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return {
      lifestage: column(header, new RegExp(`^${esc}Lifestage of Victory Group members$`, "i"), false),
      interns: column(header, new RegExp(`^${esc}Name of your intern\\(s\\) in Victory Group$`, "i"), false),
      day: column(header, new RegExp(`^${esc}Day of Victory Group meeting$`, "i"), false),
      time: column(header, new RegExp(`^${esc}Time of Victory Group meeting$`, "i"), false),
      venue: column(header, new RegExp(`^${esc}Venue of Victory Group meeting$`, "i"), false),
    };
  }

  const byService = Object.fromEntries(SERVICE_BUCKETS.map((b) => [b, emptyBucketCounts()])) as Record<
    VgServiceBucket,
    VgBucketCounts
  >;
  const detailsByService = Object.fromEntries(SERVICE_BUCKETS.map((b) => [b, emptyBucketDetail()])) as Record<
    VgServiceBucket,
    VgBucketDetail
  >;
  const vglByGender = Object.fromEntries(SERVICE_BUCKETS.map((b) => [b, { male: 0, female: 0 }])) as Record<
    VgServiceBucket,
    { male: number; female: number }
  >;

  const matchLeader = createLeaderMatcher(leaders);
  let respondents = 0;
  let matched = 0;
  let nextSyntheticId = -1;
  const skippedNoService: string[] = [];
  const leaderRows: SnapshotLeaderRow[] = [];

  for (const r of body) {
    const cell = (i: number) => (i >= 0 ? String(r[i] ?? "") : "");
    if (!parseFormTimestamp(cell(col.timestamp))) continue; // summary rows below the responses
    const lastName = cell(col.lastName).trim();
    const firstName = cell(col.firstName).trim();
    if (!lastName || !firstName) continue;
    respondents += 1;

    const match = matchLeader({ lastName, firstName, mobileNumber: cell(col.mobile) || null });
    if (match) matched += 1;
    const leaderId = match ? match.leader.id : nextSyntheticId--;
    // Matched: the record's own name, as live snapshots show it. Unmatched: as typed in the form.
    const name = match
      ? `${match.leader.lastName}, ${match.leader.firstName}`
      : `${formatPersonName(lastName)}, ${formatPersonName(firstName)}`;

    const n = parseInt(cell(col.groupCount), 10) || 0; // "I am only currently leading a Leadership Group" -> 0
    const isLgl = /^yes/i.test(cell(col.isLgl).trim());
    leaderRows.push({
      id: leaderId,
      timestamp: cell(col.timestamp).trim(),
      startedLeading: cell(col.startedLeading).trim(),
      lastName: formatPersonName(lastName),
      firstName: formatPersonName(firstName),
      nickname: cell(col.nickname).trim(),
      mobileNumber: cell(col.mobile).trim(),
      facebook: cell(col.facebook).trim(),
      gender: cell(col.gender).trim(),
      age: cell(col.age).trim(),
      lifestage: cell(col.lifestage).trim(),
      service: normalizeFormService(cell(col.service)) ?? "",
      discipleshipJourney: cell(col.journey).trim(),
      leadership113: cell(col.leadership113).trim(),
      ownVgLeader: cell(col.ownVgLeader).trim(),
      isLeadershipGroupLeader: isLgl,
      leadershipGroupMembers: cell(col.lglMembers).trim(),
      groups: Array.from({ length: n }, (_, i) => {
        const gc = groupColumns(n, i + 1);
        return {
          lifestage: cell(gc.lifestage).trim(),
          interns: cell(gc.interns).trim(),
          day: cell(gc.day).trim(),
          time: formatTime(cell(gc.time)),
          venue: cell(gc.venue).trim(),
        };
      }),
    });

    const bucket = serviceToBucket(normalizeFormService(cell(col.service)));
    if (!bucket) {
      skippedNoService.push(name);
      continue;
    }

    byService[bucket].vgLeaders += 1;
    detailsByService[bucket].vgLeaders.push({ id: leaderId, name });
    const gender = cell(col.gender).trim().toLowerCase();
    if (gender === "male") vglByGender[bucket].male += 1;
    if (gender === "female") vglByGender[bucket].female += 1;

    if (isLgl) {
      byService[bucket].leadershipGroups += 1;
      detailsByService[bucket].leadershipGroups.push({ id: leaderId, name });
    }

    for (let k = 1; k <= n; k++) {
      const gc = groupColumns(n, k);
      const day = cell(gc.day).trim();
      byService[bucket].victoryGroups += 1;
      detailsByService[bucket].victoryGroups.push({
        id: nextSyntheticId--,
        label: `${name} — ${day || "?"} ${formatTime(cell(gc.time))} @ ${cell(gc.venue).trim() || "?"}`,
        key: victoryGroupKey(leaderId, day),
      });
      for (const intern of splitInternNames(cell(gc.interns))) {
        byService[bucket].interns += 1;
        detailsByService[bucket].interns.push(intern);
      }
    }
  }

  const totals = emptyBucketCounts();
  const genderTotals = { male: 0, female: 0 };
  const totalsDetail = emptyBucketDetail();
  for (const bucket of SERVICE_BUCKETS) {
    for (const k of Object.keys(totals) as (keyof VgBucketCounts)[]) totals[k] += byService[bucket][k];
    genderTotals.male += vglByGender[bucket].male;
    genderTotals.female += vglByGender[bucket].female;
    totalsDetail.vgLeaders.push(...detailsByService[bucket].vgLeaders);
    totalsDetail.victoryGroups.push(...detailsByService[bucket].victoryGroups);
    totalsDetail.interns.push(...detailsByService[bucket].interns);
    totalsDetail.leadershipGroups.push(...detailsByService[bucket].leadershipGroups);
  }

  return {
    data: { byService, totals, vglByGender, genderTotals, detailsByService, totalsDetail, leaderRows },
    respondents,
    matched,
    skippedNoService,
  };
}
