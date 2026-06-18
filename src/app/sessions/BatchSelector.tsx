"use client";

import { useRouter } from "next/navigation";

type Batch = { id: number; name: string };

export function BatchSelector({
  batches,
  selectedId,
}: {
  batches: Batch[];
  selectedId: number | null;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId ?? ""}
      onChange={(e) => {
        const val = e.target.value;
        router.push(val ? `/sessions?batch=${val}` : "/sessions");
      }}
      className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      <option value="">All sessions</option>
      {batches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}
