import type { CheckInStatus } from "@/db/schema";

const PILL: Record<CheckInStatus, { pill: string; dot: string }> = {
  "On-time": { pill: "bg-green-50 text-green-800 ring-green-600/25", dot: "bg-green-600" },
  Late: { pill: "bg-amber-50 text-amber-800 ring-amber-600/30", dot: "bg-amber-500" },
  Absent: { pill: "bg-red-50 text-red-800 ring-red-600/25", dot: "bg-red-600" },
};

/** Check-in status as a word with its color — never color alone. */
export function StatusPill({ status, className = "" }: { status: CheckInStatus; className?: string }) {
  const { pill, dot } = PILL[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${pill} ${className}`}>
      <span className={`size-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {status}
    </span>
  );
}

/** A small neutral tag (class, Victory Day, VGLs only…). */
export function Tag({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "blue" | "amber" }) {
  const cls = {
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-[#00428E]/10 text-[#00428E]",
    amber: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25",
  }[tone];
  return <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}
