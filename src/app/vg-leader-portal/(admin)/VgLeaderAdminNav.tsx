"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/vg-leader-portal/leaders", label: "VG Leaders", description: "Manage VG leaders and portal accounts.", tab: true },
  { href: "/vg-leader-portal/disciplers", label: "Disciplers", description: "VG leaders without a claimed portal account.", tab: true },
  { href: "/vg-leader-portal/interns", label: "Interns", description: "Interns attached to Victory Groups.", tab: true },
  { href: "/vg-leader-portal/vgl-report", label: "VG Leaders Report", description: "Demographics and stats for claimed VG leaders.", tab: false },
  { href: "/vg-leader-portal/vg-report", label: "Victory Group Report", description: "Victory Group schedules and membership breakdown.", tab: false },
  { href: "/vg-leader-portal/quarterly-report", label: "Quarterly Report", description: "Quarterly snapshots and convergence attendance.", tab: false },
  { href: "/vg-leader-portal/discipleship-journey-report", label: "Discipleship Journey Report", description: "Discipleship Journey steps completed per claimed VG leader.", tab: false },
];

const TABS = SECTIONS.filter((s) => s.tab);

export function VgLeaderAdminNav() {
  const pathname = usePathname();
  const current = SECTIONS.find((s) => pathname.startsWith(s.href));

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mt-2">{current?.label ?? "VG Leader Portal"}</h2>
      <p className="text-sm text-gray-500 mt-0.5">{current?.description ?? "Manage portal accounts and view VG leader reports."}</p>
      {current?.tab !== false && (
        <nav className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {TABS.map(({ href, label }) => {
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
      )}
    </>
  );
}
