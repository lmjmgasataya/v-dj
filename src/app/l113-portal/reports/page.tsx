import Link from "next/link";
import { getL113Batches, pickBatch } from "@/lib/l113Data";
import { L113_MIN_ATTENDANCE_PCT, L113_MIN_SCORE_PCT } from "@/lib/l113Reports";
import { L113Header } from "../ui";
import { REPORTS } from "./ui";

export default async function L113ReportsPage({ searchParams }: { searchParams: Promise<{ batch?: string }> }) {
  const { batch: batchParam } = await searchParams;
  const batch = pickBatch(await getL113Batches(), batchParam);

  return (
    <>
      <L113Header title="Reports" description="Attendance, scores and teacher feedback from the L113 Portal." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.perBatch && batch ? `${r.href}?batch=${batch.id}` : r.href}
            className="flex flex-col gap-2 rounded-2xl bg-white border border-gray-200 shadow-sm p-6 hover:border-indigo-400 hover:shadow-md transition"
          >
            <span className="text-3xl">{r.icon}</span>
            <span className="text-base font-semibold text-gray-900">{r.title}</span>
            <span className="text-sm text-gray-500">{r.text}</span>
          </Link>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        On track to graduate: attendance of at least {L113_MIN_ATTENDANCE_PCT}% (On Time and Late both count), an overall score of at
        least {L113_MIN_SCORE_PCT}%, and a Spiritual Disciplines report for every month of the batch that has ended. A check with nothing
        to judge yet is skipped.
      </p>
    </>
  );
}
