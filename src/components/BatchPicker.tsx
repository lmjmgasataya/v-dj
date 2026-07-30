"use client";

import { useRouter, usePathname } from "next/navigation";

interface Batch {
  id: number;
  name: string;
}

export function BatchPicker({
  batches,
  selectedId,
}: {
  batches: Batch[];
  selectedId: number | null;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    router.push(id ? `${pathname}?batch=${id}` : pathname);
  }

  if (batches.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">
        Batch
      </label>
      <select
        value={selectedId ?? ""}
        onChange={handleChange}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        {batches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}
