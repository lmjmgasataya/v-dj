"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/sessions", label: "Sessions" },
  { href: "/sessions/batches", label: "Batches" },
];

export function SessionsNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 border-b border-gray-200">
      {TABS.map(({ href, label }) => {
        const active =
          href === "/sessions"
            ? !pathname.startsWith("/sessions/batches")
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              active
                ? "border-[#00428E] text-[#00428E]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
