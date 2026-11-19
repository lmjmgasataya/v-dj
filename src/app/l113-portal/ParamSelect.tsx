"use client";

import { useRouter } from "next/navigation";

/** A select that navigates to `${hrefPrefix}${value}` — the prefix carries the other query params. */
export function ParamSelect({
  label,
  hrefPrefix,
  options,
  value,
}: {
  label: string;
  hrefPrefix: string;
  options: { value: string; label: string }[];
  value: string;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">{label}</label>
      <select
        value={value}
        onChange={(e) => router.push(`${hrefPrefix}${encodeURIComponent(e.target.value)}`)}
        className="min-w-0 flex-1 sm:flex-none rounded-lg border border-gray-300 px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
