import Link from "next/link";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Page not found · Victory Iloilo Discipleship Database" };

/** App-wide 404 (the L113 Portal has its own). Sends people back to the right home for their role. */
export default async function NotFound() {
  const session = await getSession();
  const home =
    session?.role === "vg_leader"
      ? { href: "/vg-portal", label: "Go to the VG Leader Portal" }
      : session?.role === "lead_pastor"
        ? { href: "/journey", label: "Go to the Discipleship Journey Portal" }
        : session
          ? { href: "/", label: "Go to the home page" }
          : { href: "/login", label: "Go to the login page" };

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-4 py-8">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-10 flex flex-col items-center text-center gap-3">
        <span className="text-5xl" aria-hidden>
          🧭
        </span>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">404 · Page not found</p>
        <h2 className="text-2xl font-bold text-gray-900">We couldn&apos;t find that page</h2>
        <p className="text-sm text-gray-600 max-w-md">
          The link may be mistyped or out of date, or what it pointed to has been removed. Check the address, or start again from the home
          page.
        </p>
        <Link
          href={home.href}
          className="mt-3 px-5 py-2.5 bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold rounded-lg transition"
        >
          {home.label}
        </Link>
      </div>
    </div>
  );
}
