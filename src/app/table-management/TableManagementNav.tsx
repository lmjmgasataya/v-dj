"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/table-management/assignments", label: "Assignments", developerOnly: false },
  { href: "/table-management/settings", label: "Settings", developerOnly: true },
];

export function TableManagementNav({ isDeveloper }: { isDeveloper: boolean }) {
  const pathname = usePathname();
  const visibleLinks = links.filter((l) => !l.developerOnly || isDeveloper);

  return (
    <nav className="flex gap-1 border-b border-gray-200">
      {visibleLinks.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              active
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
