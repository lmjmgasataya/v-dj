import { SERVICE_OPTIONS } from "@/components/form";

/**
 * A service's place in the standard order (SERVICE_OPTIONS: 9AM, 11AM, 2PM, 4PM, 6PM Mandurriao,
 * then 10AM, 1PM Lapaz) — use it for every sort by service. "Not Set" and anything unknown go last;
 * a comma-separated list sorts by its first service.
 */
export function serviceRank(service: string | null | undefined): number {
  const first = (service ?? "").split(",")[0].trim();
  const i = SERVICE_OPTIONS.indexOf(first);
  return i === -1 ? SERVICE_OPTIONS.length : i;
}
