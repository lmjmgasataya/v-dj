"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/manage-vg-leaders/leaders", label: "VG Leaders" },
  { href: "/manage-vg-leaders", label: "Promote Disciplers" },
  { href: "/manage-vg-leaders/report", label: "Report" },
  { href: "/manage-vg-leaders/vg-report", label: "Victory Group Report" },
];

export function ManageVgLeadersNav() {
  const pathname = usePathname();
  return (
    <nav className="mt-3 flex gap-1 overflow-x-auto pb-1">
      {NAV.map(({ href, label }) => {
        const active = href === "/manage-vg-leaders" ? pathname === href : pathname.startsWith(href);
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
