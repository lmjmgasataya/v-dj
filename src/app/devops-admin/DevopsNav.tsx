"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/devops-admin", label: "Overview" },
  { href: "/devops-admin/batches", label: "Batches" },
  { href: "/devops-admin/class-sessions", label: "Class Sessions" },
  { href: "/devops-admin/disciplers", label: "Disciplers" },
  { href: "/devops-admin/vg-leaders", label: "VG Leaders" },
  { href: "/devops-admin/vg-groups", label: "VG Groups" },
  { href: "/devops-admin/participants", label: "Participants" },
  { href: "/devops-admin/check-ins", label: "Check-ins" },
  { href: "/devops-admin/login-logs", label: "Login Logs" },
  { href: "/devops-admin/data", label: "Data" },
];

export function DevopsNav() {
  const pathname = usePathname();
  return (
    <nav className="mt-3 flex gap-1 overflow-x-auto pb-1">
      {NAV.map(({ href, label }) => {
        const active = href === "/devops-admin" ? pathname === href : pathname.startsWith(href);
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
