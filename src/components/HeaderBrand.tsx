"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function HeaderBrand({ isVgLeaderSession }: { isVgLeaderSession: boolean }) {
  const pathname = usePathname();
  const isVgPortal = isVgLeaderSession || pathname.startsWith("/vg-portal");

  return (
    <Link href={isVgLeaderSession ? "/vg-portal" : "/"} className="hover:opacity-80 transition">
      <p className="text-xs font-medium text-indigo-200 uppercase tracking-widest">Victory Iloilo</p>
      <h1 className="text-lg font-bold leading-tight">{isVgPortal ? "VG Leader Portal" : "Discipleship Database"}</h1>
    </Link>
  );
}
