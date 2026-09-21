"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition, type ReactNode } from "react";

interface SnapshotOption {
  id: number;
  label: string;
}

function ComparisonSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="h-4 w-44 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 flex gap-6 animate-pulse">
            {[40, 90, 90, 70].map((w, j) => (
              <div key={j} className="h-3 rounded bg-gray-200" style={{ width: w }} />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} className="flex gap-6 px-4 py-3 border-b border-gray-100 animate-pulse">
              <div className="h-4 w-32 rounded bg-gray-200" />
              <div className="h-4 w-16 rounded bg-gray-100" />
              <div className="h-4 w-16 rounded bg-gray-100" />
              <div className="h-4 w-12 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ))}

      <div>
        <div className="h-4 w-40 rounded bg-gray-200 animate-pulse mb-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-gray-900 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700">
                <div className="h-4 w-24 rounded bg-gray-700 animate-pulse" />
              </div>
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex gap-6 px-4 py-3 border-b border-gray-800 animate-pulse">
                  <div className="h-4 w-32 rounded bg-gray-700" />
                  <div className="h-4 w-16 rounded bg-gray-800" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function ComparisonPicker({
  snapshots,
  aId,
  bId,
  exportHref,
  between,
  children,
}: {
  snapshots: SnapshotOption[];
  aId: number | null;
  bId: number | null;
  exportHref?: string;
  between?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function navigate(nextA: number, nextB: number | null) {
    const params = new URLSearchParams();
    params.set("a", String(nextA));
    if (nextB != null) params.set("b", String(nextB));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Quarterly Discipleship Report</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Each snapshot captures a point-in-time count. Save one at the end of every quarter to get quarter-over-quarter comparisons below.
          </p>
        </div>
        {snapshots.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Compare</label>
              <select
                value={aId ?? ""}
                onChange={(e) => navigate(Number(e.target.value), bId)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400">vs</span>
              <select
                value={bId ?? ""}
                onChange={(e) => navigate(aId!, e.target.value ? Number(e.target.value) : null)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">(none)</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            {exportHref && (
              <a
                href={exportHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-white bg-[#00428E] hover:bg-[#003578] px-3 py-1.5 rounded-lg transition"
              >
                Export PDF
              </a>
            )}
          </div>
        )}
      </div>

      {between}

      {isPending ? <ComparisonSkeleton /> : children}
    </>
  );
}
