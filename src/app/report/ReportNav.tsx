"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const allLinks = [
  { href: "/report", label: "Attendance", icon: "✅", adminOnly: false },
  { href: "/report/registrations", label: "Registrations", icon: "📈", adminOnly: true },
  { href: "/report/checkins", label: "Check-in Times", icon: "🕐", adminOnly: true },
  { href: "/report/class-category", label: "Class Category", icon: "💰", adminOnly: true },
  { href: "/report/funnel", label: "Completion Funnel", icon: "📉", adminOnly: true },
  { href: "/report/demographics", label: "Demographics", icon: "👥", adminOnly: true },
];

export function ReportNav({ role }: { role: string }) {
  const pathname = usePathname();
  const links = role === "admin_volunteer" ? allLinks.filter((l) => !l.adminOnly) : allLinks;

  return (
    <nav className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-1">
        Reports
      </p>
      {links.map(({ href, label, icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
              active
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <span className="text-base">{icon}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
