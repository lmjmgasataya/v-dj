import Link from "next/link";

export const REPORTS = [
  {
    href: "/l113-portal/reports/attendance",
    icon: "📊",
    title: "Batch Attendance Summary",
    text: "On Time, Late and Absent per student, with those at risk flagged.",
    perBatch: true,
  },
  {
    href: "/l113-portal/reports/students",
    icon: "🎓",
    title: "Student Report Cards",
    text: "Attendance, scores and spiritual disciplines per student, and who is on track to graduate.",
    perBatch: true,
  },
  {
    href: "/l113-portal/reports/teachers",
    icon: "⭐",
    title: "Teacher Scorecard",
    text: "Average ratings per teacher/facilitator across topics and batches, with students' comments.",
    perBatch: false,
  },
] as const;

/** Tabs between the reports; keeps the selected batch. */
export function ReportTabs({ current, batchId }: { current: string; batchId?: number }) {
  return (
    <nav className="flex flex-wrap gap-2 print:hidden" aria-label="Reports">
      {REPORTS.map((r) => (
        <Link
          key={r.href}
          href={batchId ? `${r.href}?batch=${batchId}` : r.href}
          aria-current={current === r.href ? "page" : undefined}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
            current === r.href ? "bg-[#00428E] border-[#00428E] text-white" : "bg-white border-gray-200 text-gray-700 hover:border-indigo-300"
          }`}
        >
          {r.icon} {r.title}
        </Link>
      ))}
    </nav>
  );
}

/** ✓ / ✗ / — for a readiness check (null = nothing to judge yet). */
export function CheckMark({ ok, label }: { ok: boolean | null; label?: string }) {
  if (ok == null) return <span className="text-gray-300" title="Nothing to check yet">—</span>;
  return (
    <span className={ok ? "text-green-600 font-bold" : "text-red-600 font-bold"} title={label}>
      {ok ? "✓" : "✗"}
    </span>
  );
}

export function ReadyBadge({ ready }: { ready: boolean }) {
  return ready ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap">On track</span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium whitespace-nowrap">Needs attention</span>
  );
}

export const pctClass = (value: number | null, min: number) =>
  value == null ? "text-gray-400" : value >= min ? "text-gray-800" : "text-red-600 font-semibold";
