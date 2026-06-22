"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";

function ResultsSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex gap-6">
        <div className="h-4 w-6 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-6 px-4 py-3 border-b border-gray-100 ${
            i % 2 === 0 ? "bg-white" : "bg-gray-50"
          }`}
        >
          <div className="h-4 w-6 rounded bg-gray-200 animate-pulse shrink-0" />
          <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
        </div>
      ))}
      <div className="bg-gray-50 border-t-2 border-gray-200 px-4 py-3 flex justify-end gap-6">
        <div className="h-4 w-10 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-8 rounded bg-gray-200 animate-pulse" />
      </div>
    </div>
  );
}

export function DatePicker({ date, children }: { date: string; children?: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600">Date</label>
        <input
          type="date"
          defaultValue={date}
          onChange={(e) => {
            if (e.target.value) {
              startTransition(() => {
                router.push(`/report/remittance?date=${e.target.value}`);
              });
            }
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
      {isPending ? <ResultsSkeleton /> : children}
    </>
  );
}
