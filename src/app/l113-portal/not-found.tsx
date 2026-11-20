import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const LINKS = [
  { href: "/l113-portal", label: "L113 Portal home", text: "All L113 pages" },
  { href: "/l113-portal/reports", label: "Reports", text: "Attendance, report cards, teacher scorecard" },
  { href: "/l113-portal/batches", label: "Batches", text: "Batches and their students" },
  { href: "/l113-portal/schedule", label: "Schedule", text: "Topics, dates and teachers" },
];

/** 404 for the L113 Portal: a mistyped link, or a batch/student/teacher that no longer exists. */
export default function L113NotFound() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "L113 Portal", href: "/l113-portal" }, { label: "Page not found" }]} />
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-10 flex flex-col items-center text-center gap-3">
        <span className="text-5xl" aria-hidden>🧭</span>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">404 · L113 Portal</p>
        <h2 className="text-2xl font-bold text-gray-900">We couldn&apos;t find that page</h2>
        <p className="text-sm text-gray-600 max-w-md">
          The link may be mistyped, or what it points to is gone: a batch that was deleted, a student removed from that batch, or a
          teacher or topic that no longer exists.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex flex-col gap-0.5 rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-indigo-400 hover:shadow-sm transition"
          >
            <span className="font-semibold text-gray-900">{l.label} →</span>
            <span className="text-xs text-gray-500">{l.text}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
