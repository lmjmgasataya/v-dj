"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

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
  /** "live" = Live Now on the left. */
  aId: number | "live" | null;
  bId: number | null;
  exportHref?: string;
  between?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  // What was just picked, shown while the new comparison loads — otherwise the dropdowns
  // snap back to the old values until the server responds, as if the click did nothing.
  const [picked, setPicked] = useState<{ a: number | "live"; b: number | null } | null>(null);
  const shownA = isPending && picked ? picked.a : aId;
  const shownB = isPending && picked ? picked.b : bId;

  function navigate(nextA: number | "live", nextB: number | null) {
    setPicked({ a: nextA, b: nextB });
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
                value={shownA ?? ""}
                disabled={isPending}
                onChange={(e) => navigate(e.target.value === "live" ? "live" : Number(e.target.value), shownB)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
              >
                <option value="live">● Live Now</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400">vs</span>
              <select
                value={shownB ?? ""}
                disabled={isPending}
                onChange={(e) => navigate(shownA!, e.target.value ? Number(e.target.value) : null)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
              >
                <option value="">(none)</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            {isPending && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500" role="status">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 border-t-indigo-600 animate-spin" />
                Loading…
              </span>
            )}
            {exportHref && !isPending && (
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

      {/* Dimmed while loading so the stale Live Now summary doesn't read as the new result. */}
      <div className={`flex flex-col gap-6 transition-opacity ${isPending ? "opacity-40 pointer-events-none" : ""}`}>
        {between}
      </div>

      {isPending ? <ComparisonSkeleton /> : children}
    </>
  );
}
