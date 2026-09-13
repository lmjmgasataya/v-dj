"use client";

import { useRouter, usePathname } from "next/navigation";

interface SnapshotOption {
  id: number;
  label: string;
}

export function ComparisonPicker({
  snapshots,
  aId,
  bId,
}: {
  snapshots: SnapshotOption[];
  aId: number;
  bId: number | null;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(nextA: number, nextB: number | null) {
    const params = new URLSearchParams();
    params.set("a", String(nextA));
    if (nextB != null) params.set("b", String(nextB));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Compare</label>
      <select
        value={aId}
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
        onChange={(e) => navigate(aId, e.target.value ? Number(e.target.value) : null)}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">(none)</option>
        {snapshots.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}
