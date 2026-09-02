"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/manage-vg-leaders/disciplers", label: "Disciplers" },
  { href: "/manage-vg-leaders/interns", label: "Interns" },
];

const REPORT_PATHS = ["/manage-vg-leaders/report", "/manage-vg-leaders/vg-report", "/manage-vg-leaders/quarterly-report"];

export function ManageVgLeadersNav() {
  const pathname = usePathname();
  if (REPORT_PATHS.some((p) => pathname.startsWith(p))) return null;
  return (
    <nav className="mt-3 flex gap-1 overflow-x-auto pb-1">
      {NAV.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              active ? "bg-[#00428E] text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
