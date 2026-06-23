"use client";

import { useRouter, usePathname } from "next/navigation";

interface DateOption {
  value: string;
  label: string;
}

export function ServiceDatePicker({
  dates,
  selected,
  batchId,
}: {
  dates: DateOption[];
  selected: string | null;
  batchId: number | null;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams();
    if (batchId !== null) params.set("batch", String(batchId));
    if (e.target.value) params.set("service_date", e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={selected ?? ""}
      onChange={handleChange}
      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      <option value="">Overall Total</option>
      {dates.map((d) => (
        <option key={d.value} value={d.value}>
          {d.label}
        </option>
      ))}
    </select>
  );
}
