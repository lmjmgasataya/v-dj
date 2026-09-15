export const TIME_SERVICES = ["9AM", "11AM", "2PM & 4PM", "6PM", "10AM & 1PM"] as const;
export type LeadPastorTimeService = (typeof TIME_SERVICES)[number];

const TIME_SERVICE_TO_RAW: Record<LeadPastorTimeService, string[]> = {
  "9AM": ["9AM - Mandurriao"],
  "11AM": ["11AM - Mandurriao"],
  "2PM & 4PM": ["2PM - Mandurriao", "4PM - Mandurriao"],
  "6PM": ["6PM - Mandurriao"],
  "10AM & 1PM": ["10AM - Lapaz", "1PM - Lapaz"],
};

// Fail closed: an unset/invalid bucket yields no raw values, and inArray(col, [])
// compiles to `false` in drizzle — so a misconfigured lead_pastor sees nothing
// rather than everything.
export function rawServiceValues(bucket: LeadPastorTimeService | null | undefined): string[] {
  return bucket ? (TIME_SERVICE_TO_RAW[bucket] ?? []) : [];
}
