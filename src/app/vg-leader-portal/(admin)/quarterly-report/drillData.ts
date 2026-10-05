import { sql } from "drizzle-orm";
import { vgReportSnapshots } from "@/db/schema";
import {
  SERVICE_BUCKETS,
  snapshotItems,
  diffSnapshotItems,
  type DrillItem,
  type MatchItem,
  type VgSnapshotData,
  type VgServiceBucket,
} from "@/lib/vgSnapshot";

export type Side = { label: string; data: VgSnapshotData };
export type Metric = keyof VgSnapshotData["totals"];

/**
 * A snapshot's `data` minus what the report never reads — the export-only `totalsDetail`, and
 * `leaderRows` cut down to the id + service the drill-downs use (it's most of the row's size).
 */
export function reportSnapshotData() {
  return sql<unknown>`(${vgReportSnapshots.data} - 'totalsDetail' - 'leaderRows') || jsonb_build_object('leaderRows', (
    select jsonb_agg(jsonb_build_object('id', r->'id', 'service', r->'service'))
    from jsonb_array_elements(coalesce(${vgReportSnapshots.data}->'leaderRows', '[]'::jsonb)) r
  ))`;
}

const METRICS: Metric[] = ["vgLeaders", "victoryGroups", "interns", "leadershipGroups"];

/** The name lists behind one cell of the comparison (see drill). */
export type DrillLists = {
  detail: DrillItem[] | null;
  prevDetail: DrillItem[] | null;
  // MatchItems so drillReasons can look up the record behind each change.
  added: MatchItem[] | null;
  removed: MatchItem[] | null;
  kept: MatchItem[] | null;
};

/** DrillLists as sent to the popup: plain items (label, service, reason). */
export type ShownDrillLists = { [K in keyof DrillLists]: DrillItem[] | null };

/**
 * What a cell needs to render without its name lists, which are fetched on click instead:
 * whether each side has names to show, and the size of each change list (for "+12 / −8").
 */
export type DrillSummary = {
  cellKey: string;
  hasDetail: boolean;
  hasPrevDetail: boolean;
  change: { added: number; removed: number; kept: number } | null;
};

export const DRILL_METRICS = METRICS;

export function drillCellKey(bucket: VgServiceBucket | null, metric: Metric) {
  return `${bucket ?? "all"}|${metric}`;
}

// The names behind one number (with their service), what the compared side had, and who was
// added/removed/kept — for one service bucket, or all of them when `bucket` is null. Null name
// lists (manually entered or edited snapshots) just show the number.
function drill(latest: Side, previous: Side | null, bucket: VgServiceBucket | null, metric: Metric): DrillLists {
  const detail = snapshotItems(latest.data, bucket, metric);
  const prevDetail = previous ? snapshotItems(previous.data, bucket, metric) : null;
  const change = previous ? diffSnapshotItems(detail, prevDetail, metric) : null;
  return { detail, prevDetail, added: change?.added ?? null, removed: change?.removed ?? null, kept: change?.kept ?? null };
}

export function drillSummary(latest: Side, previous: Side | null, bucket: VgServiceBucket | null, metric: Metric): DrillSummary {
  const d = drill(latest, previous, bucket, metric);
  return {
    cellKey: drillCellKey(bucket, metric),
    hasDetail: (d.detail?.length ?? 0) > 0,
    hasPrevDetail: (d.prevDetail?.length ?? 0) > 0,
    change: d.added && d.removed && d.kept ? { added: d.added.length, removed: d.removed.length, kept: d.kept.length } : null,
  };
}

/** Every cell's name lists for one comparison, keyed by drillCellKey. */
export function allDrillLists(latest: Side, previous: Side | null): Record<string, DrillLists> {
  const out: Record<string, DrillLists> = {};
  for (const metric of METRICS) {
    for (const bucket of [null, ...SERVICE_BUCKETS]) {
      out[drillCellKey(bucket, metric)] = drill(latest, previous, bucket, metric);
    }
  }
  return out;
}
