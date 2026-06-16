"use client";

import { useRouter } from "next/navigation";

export function DatePicker({ date }: { date: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-600">Date</label>
      <input
        type="date"
        defaultValue={date}
        onChange={(e) => {
          if (e.target.value) router.push(`/report/remittance?date=${e.target.value}`);
        }}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>
  );
}
