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

export type VgLeaderRef = { id: number; name: string };
export type VgGroupRef = { id: number; label: string };

export type VgBucketDetail = {
  vgLeaders: VgLeaderRef[];
  victoryGroups: VgGroupRef[];
  interns: string[];
  leadershipGroups: VgLeaderRef[];
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
};

export function emptyBucketDetail(): VgBucketDetail {
  return { vgLeaders: [], victoryGroups: [], interns: [], leadershipGroups: [] };
}

export function emptyBucketCounts(): VgBucketCounts {
  return { vgLeaders: 0, victoryGroups: 0, interns: 0, leadershipGroups: 0 };
}
