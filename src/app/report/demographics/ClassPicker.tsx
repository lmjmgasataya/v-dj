"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { FEE_CATEGORIES } from "@/components/form";

export function ClassPicker({ selected }: { selected: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function handleToggle(value: string) {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];

    const p = new URLSearchParams(params.toString());
    if (next.length === 0 || next.length === FEE_CATEGORIES.length) {
      p.delete("class");
    } else {
      p.set("class", next.join(","));
    }
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">
        Class
      </label>
      <div className="flex items-center gap-4">
        {FEE_CATEGORIES.map((cat) => (
          <label key={cat.value} className="flex items-center gap-1.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={selected.includes(cat.value)}
              onChange={() => handleToggle(cat.value)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
            />
            Class {cat.value}
          </label>
        ))}
      </div>
    </div>
  );
}
