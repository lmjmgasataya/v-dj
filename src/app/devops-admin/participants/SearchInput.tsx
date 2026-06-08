"use client";

import { useRouter, usePathname } from "next/navigation";
import { useRef } from "react";

export function SearchInput({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    clearTimeout(timer.current);
    const val = e.target.value;
    timer.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (val.trim()) params.set("q", val.trim());
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
  }

  return (
    <input
      defaultValue={defaultValue}
      onChange={handleChange}
      placeholder="Search by name or mobile..."
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
    />
  );
}
