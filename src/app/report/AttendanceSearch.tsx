"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

export function AttendanceSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("q", value.trim());
      } else {
        params.delete("q");
      }
      startTransition(() => {
        router.replace(`/report?${params.toString()}`, { scroll: false });
      });
    }, 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full sm:w-80">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by last or first name..."
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        autoFocus
      />
      {isPending && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          <svg className="w-4 h-4 text-indigo-400 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </span>
      )}
    </div>
  );
}
