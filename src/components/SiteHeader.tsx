"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

const INTERN_REGISTRATION_PATHS = [/^\/vg-portal\/events\/[^/]+\/intern\/?$/];

export function SiteHeader({ session }: { session: { name: string; role: string } | null }) {
  const pathname = usePathname();

  const isInternRegistration = INTERN_REGISTRATION_PATHS.some((re) => re.test(pathname));
  const isVgPortal = session?.role === "vg_leader" || pathname.startsWith("/vg-portal");

  return (
    <header className="text-white shadow" style={{ backgroundColor: "#00428E" }}>
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        {isInternRegistration ? (
          <div>
            <p className="text-xs font-medium text-indigo-200 uppercase tracking-widest">Victory Iloilo</p>
            <h1 className="text-lg font-bold leading-tight">Intern Registration</h1>
          </div>
        ) : (
          <Link href={session?.role === "vg_leader" ? "/vg-portal" : "/"} className="hover:opacity-80 transition">
            <p className="text-xs font-medium text-indigo-200 uppercase tracking-widest">Victory Iloilo</p>
            <h1 className="text-lg font-bold leading-tight">{isVgPortal ? "VG Leader Portal" : "Discipleship Database"}</h1>
          </Link>
        )}
        {session && (
          <div className="flex items-center gap-4">
            <span className="text-xs text-indigo-200 capitalize">{session.name}</span>
            <form action={logout}>
              <button
                type="submit"
                className="text-xs text-indigo-300 hover:text-white underline underline-offset-2 transition"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
